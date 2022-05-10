/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, SavedObjectReference } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

import { Query } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/es-query';

import type {
  LensSavedObjectAttributes,
  FieldBasedIndexPatternColumn,
  XYDataLayerConfig,
  IndexPatternPersistedState,
} from '@kbn/lens-plugin/public';

import type { JobCreatorType } from '../common/job_creator';
import { createEmptyJob, createEmptyDatafeed } from '../common/job_creator/util/default_configs';
import { stashJobForCloning } from '../common/job_creator/util/general';
import { CREATED_BY_LABEL } from '../../../../../common/constants/new_job';
import { createAbsoluteTimeRange } from '../../../../../common/util/date_utils';
import { createQueries, getDefaultQuery } from '../utils/new_job_utils';
import { lensOperationToMlFunction } from './utils';

const COMPATIBLE_SERIES_TYPES = [
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

const COMPATIBLE_LAYER_TYPE = 'data';

export async function canCreateAndStashADJob(
  vis: LensSavedObjectAttributes,
  startString: string,
  endString: string,
  query: Query,
  filters: Filter[],
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient
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
      const range = createAbsoluteTimeRange({ to: endString, from: startString });
      start = range?.from;
      end = range?.to;

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

  const mainQuery = query?.query !== '' ? query : vis.state.query;

  const { combinedQuery } = createQueries(
    { query: mainQuery, filter: filters },
    dataView,
    kibanaConfig
  );
  datafeedConfig.query = combinedQuery;

  jobConfig.analysis_config.detectors = createDetectors(fields, splitField);

  jobConfig.data_description.time_field = timeField.sourceField;
  jobConfig.analysis_config.bucket_span = '15m';
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

  const { columns } = layer as { columns: Record<string, FieldBasedIndexPatternColumn> };
  const cols = Object.entries(columns);
  const timeFieldCol = cols.find(([, c]) => c.dataType === 'date');
  if (timeFieldCol === undefined) {
    throw Error('Cannot find a date field.');
  }

  const [, timeField] = timeFieldCol;

  const fields = firstCompatibleLayer.accessors.map((a) => columns[a]);

  const splitField = firstCompatibleLayer.splitAccessor
    ? columns[firstCompatibleLayer.splitAccessor]
    : null;

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
