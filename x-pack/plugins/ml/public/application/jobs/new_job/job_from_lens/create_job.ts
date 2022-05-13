/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IUiSettingsClient, SavedObjectReference } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

import { Filter, Query, DataViewBase } from '@kbn/es-query';

import type {
  LensSavedObjectAttributes,
  FieldBasedIndexPatternColumn,
  XYDataLayerConfig,
  IndexPatternPersistedState,
  GenericIndexPatternColumn,
  IndexPatternLayer,
  TermsIndexPatternColumn,
  SeriesType,
} from '@kbn/lens-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';

import type { JobCreatorType } from '../common/job_creator';
import { createEmptyJob, createEmptyDatafeed } from '../common/job_creator/util/default_configs';
import { stashJobForCloning } from '../common/job_creator/util/general';
import { CREATED_BY_LABEL, DEFAULT_BUCKET_SPAN } from '../../../../../common/constants/new_job';
import { createQueries, getDefaultQuery } from '../utils/new_job_utils';
import { lensOperationToMlFunction } from './utils';

const COMPATIBLE_SERIES_TYPES: SeriesType[] = [
  'line',
  'bar',
  'bar_stacked',
  'bar_percentage_stacked',
  'bar_horizontal',
  'bar_horizontal_stacked',
  'area',
  'area_stacked',
  'area_percentage_stacked',
];

const COMPATIBLE_LAYER_TYPE: XYDataLayerConfig['layerType'] = 'data';

export async function canCreateAndStashADJob(
  vis: LensSavedObjectAttributes,
  startString: string,
  endString: string,
  query: Query,
  filters: Filter[],
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient,
  timeFilter: TimefilterContract
) {
  try {
    const { jobConfig, datafeedConfig, createdBy } = await createADJobFromLensSavedObject(
      vis,
      query,
      filters,
      dataViewClient,
      kibanaConfig
    );

    let start: number | undefined;
    let end: number | undefined;
    let includeTimeRange = true;

    try {
      // attempt to parse the start and end dates.
      // if start and end values cannot be determined
      // instruct the job cloning code to auto-select the
      // full time range for the index.
      const { min, max } = timeFilter.calculateBounds({ to: endString, from: startString });
      start = min?.valueOf();
      end = max?.valueOf();

      if (start === undefined || end === undefined || isNaN(start) || isNaN(end)) {
        throw Error('Incompatible time range');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      includeTimeRange = false;
      start = undefined;
      end = undefined;
    }

    // add job config and start and end dates to the
    // job cloning stash, so they can be used
    // by the new job wizards
    stashJobForCloning(
      {
        jobConfig,
        datafeedConfig,
        createdBy,
        start,
        end,
      } as JobCreatorType,
      true,
      includeTimeRange,
      !includeTimeRange
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

export async function canCreateADJob(
  vis: LensSavedObjectAttributes,
  query: Query | undefined,
  filters: Filter[] | undefined,
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient
) {
  try {
    const jobItems = await createADJobFromLensSavedObject(
      vis,
      query ?? getDefaultQuery(),
      filters ?? [],
      dataViewClient,
      kibanaConfig
    );

    return !!jobItems;
  } catch (error) {
    return false;
  }
}

async function createADJobFromLensSavedObject(
  vis: LensSavedObjectAttributes,
  query: Query,
  filters: Filter[],
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient
) {
  const { fields, timeField, splitField, dataView } = await extractFields(vis, dataViewClient);

  const jobConfig = createEmptyJob();
  const datafeedConfig = createEmptyDatafeed(dataView.title);

  const combinedFiltersAndQueries = combineQueriesAndFilters(
    { query, filters },
    { query: vis.state.query, filters: vis.state.filters },
    dataView,
    kibanaConfig
  );

  datafeedConfig.query = combinedFiltersAndQueries;

  jobConfig.analysis_config.detectors = createDetectors(fields, splitField);

  jobConfig.data_description.time_field = timeField.sourceField;
  jobConfig.analysis_config.bucket_span = DEFAULT_BUCKET_SPAN;
  if (splitField) {
    jobConfig.analysis_config.influencers = [splitField.sourceField];
  }

  const createdBy =
    splitField || jobConfig.analysis_config.detectors.length > 1
      ? CREATED_BY_LABEL.MULTI_METRIC
      : CREATED_BY_LABEL.SINGLE_METRIC;

  return {
    jobConfig,
    datafeedConfig,
    createdBy,
  };
}

async function extractFields(vis: LensSavedObjectAttributes, dataViewClient: DataViewsContract) {
  const visualization = vis.state.visualization as { layers: XYDataLayerConfig[] };
  const indexpattern = vis.state.datasourceStates.indexpattern as IndexPatternPersistedState;

  const compatibleLayers = visualization.layers.filter(
    ({ layerType, seriesType }) =>
      layerType === COMPATIBLE_LAYER_TYPE && COMPATIBLE_SERIES_TYPES.includes(seriesType)
  );

  const [firstCompatibleLayer] = compatibleLayers;

  const compatibleIndexPatternLayer = Object.entries(indexpattern.layers).find(
    ([id]) => firstCompatibleLayer.layerId === id
  );
  if (compatibleIndexPatternLayer === undefined) {
    throw Error(
      'Visualization does not contain any layers which can be used for creating an anomaly detection job.'
    );
  }

  const [layerId, layer] = compatibleIndexPatternLayer;

  const columns = getColumns(layer);
  const timeField = Object.values(columns).find(({ dataType }) => dataType === 'date');
  if (timeField === undefined) {
    throw Error('Cannot find a date field.');
  }

  const fields = firstCompatibleLayer.accessors.map((a) => columns[a]);

  const splitField = firstCompatibleLayer.splitAccessor
    ? columns[firstCompatibleLayer.splitAccessor]
    : null;

  if (
    splitField !== null &&
    isTermsField(splitField) &&
    splitField.params.secondaryFields?.length
  ) {
    throw Error('Selected split field contains more than one field');
  }

  if (splitField !== null && isStringField(splitField) === false) {
    throw Error('Selected split field type must be string');
  }

  const dataView = await getDataViewFromLens(vis.references, layerId, dataViewClient);
  if (dataView === null) {
    throw Error('No data views can be found in the visualization.');
  }

  if (timeField.sourceField !== dataView.timeFieldName) {
    throw Error('Selected time field must be the default time field configured for data view.');
  }

  return { fields, timeField, splitField, dataView };
}

function createDetectors(
  fields: FieldBasedIndexPatternColumn[],
  splitField: FieldBasedIndexPatternColumn | null
) {
  return fields.map(({ operationType, sourceField }) => {
    const func = lensOperationToMlFunction(operationType);
    if (func === null) {
      throw Error(
        `Selected function ${operationType} is not supported by anomaly detection detectors`
      );
    }
    return {
      function: func,
      field_name: sourceField,
      ...(splitField ? { partition_field_name: splitField.sourceField } : {}),
    };
  });
}

async function getDataViewFromLens(
  references: SavedObjectReference[],
  layerId: string,
  dataViewClient: DataViewsContract
) {
  const dv = references.find(
    (r) => r.type === 'index-pattern' && r.name === `indexpattern-datasource-layer-${layerId}`
  );
  if (!dv) {
    return null;
  }
  return dataViewClient.get(dv.id);
}

function getColumns(layer: Omit<IndexPatternLayer, 'indexPatternId'>) {
  const { columns } = layer;
  if (
    Object.values(columns).some(
      (c) => hasSourceField(c) === false || hasIncompatibleProperties(c) === true
    )
  ) {
    throw Error('Columns contain settings which are incompatible with ML detectors');
  }
  return columns as Record<string, FieldBasedIndexPatternColumn>;
}

function hasSourceField(column: GenericIndexPatternColumn): column is FieldBasedIndexPatternColumn {
  return 'sourceField' in column;
}

function isTermsField(column: GenericIndexPatternColumn): column is TermsIndexPatternColumn {
  return column.operationType === 'terms' && 'params' in column;
}

function isStringField(column: GenericIndexPatternColumn) {
  return column.dataType === 'string';
}

function hasIncompatibleProperties(column: GenericIndexPatternColumn) {
  return 'timeShift' in column || 'filter' in column;
}

function combineQueriesAndFilters(
  dashboard: { query: Query; filters: Filter[] },
  vis: { query: Query; filters: Filter[] },
  dataView: DataViewBase,
  kibanaConfig: IUiSettingsClient
): estypes.QueryDslQueryContainer {
  const { combinedQuery: dashboardQueries } = createQueries(
    {
      query: dashboard.query,
      filter: dashboard.filters,
    },
    dataView,
    kibanaConfig
  );

  const { combinedQuery: visQueries } = createQueries(
    {
      query: vis.query,
      filter: vis.filters,
    },
    dataView,
    kibanaConfig
  );

  return merge(dashboardQueries, visQueries);
}
