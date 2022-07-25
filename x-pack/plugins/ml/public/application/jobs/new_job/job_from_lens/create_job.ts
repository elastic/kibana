/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IUiSettingsClient, SavedObjectReference } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

import { Filter, Query, DataViewBase } from '@kbn/es-query';

import type {
  Embeddable,
  LensPublicStart,
  LensSavedObjectAttributes,
  FieldBasedIndexPatternColumn,
  XYDataLayerConfig,
  IndexPatternPersistedState,
  IndexPatternLayer,
  XYLayerConfig,
} from '@kbn/lens-plugin/public';
import { layerTypes } from '@kbn/lens-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';

import { i18n } from '@kbn/i18n';

import type { JobCreatorType } from '../common/job_creator';
import { createEmptyJob, createEmptyDatafeed } from '../common/job_creator/util/default_configs';
import { stashJobForCloning } from '../common/job_creator/util/general';
import { CREATED_BY_LABEL, DEFAULT_BUCKET_SPAN } from '../../../../../common/constants/new_job';
import { ErrorType } from '../../../../../common/util/errors';
import { createQueries } from '../utils/new_job_utils';
import {
  getVisTypeFactory,
  isCompatibleLayer,
  hasIncompatibleProperties,
  hasSourceField,
  isTermsField,
  isCompatibleSplitFieldType,
  getMlFunction,
  getJobsItemsFromEmbeddable,
} from './utils';

type VisualizationType = Awaited<ReturnType<LensPublicStart['getXyVisTypes']>>[number];

export interface LayerResult {
  id: string;
  layerType: typeof layerTypes[keyof typeof layerTypes];
  label: string;
  icon: VisualizationType['icon'];
  isCompatible: boolean;
  jobWizardType: CREATED_BY_LABEL | null;
  error?: ErrorType;
}

export async function canCreateAndStashADJob(
  vis: LensSavedObjectAttributes,
  startString: string,
  endString: string,
  query: Query,
  filters: Filter[],
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient,
  timeFilter: TimefilterContract,
  layerIndex: number | undefined
) {
  try {
    const { jobConfig, datafeedConfig, createdBy } = await createADJobFromLensSavedObject(
      vis,
      query,
      filters,
      dataViewClient,
      kibanaConfig,
      layerIndex
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
        throw Error(
          i18n.translate('xpack.ml.newJob.fromLens.createJob.error.timeRange', {
            defaultMessage: 'Incompatible time range',
          })
        );
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

export async function getResultLayersFromEmbeddable(
  embeddable: Embeddable,
  dataViewClient: DataViewsContract,
  lens: LensPublicStart
): Promise<LayerResult[]> {
  const { vis } = getJobsItemsFromEmbeddable(embeddable);
  return getLayers(vis, dataViewClient, lens);
}

async function getLayers(
  vis: LensSavedObjectAttributes,
  dataViewClient: DataViewsContract,
  lens: LensPublicStart
): Promise<LayerResult[]> {
  const visualization = vis.state.visualization as { layers: XYLayerConfig[] };
  const getVisType = await getVisTypeFactory(lens);

  const layers: LayerResult[] = await Promise.all(
    visualization.layers
      .filter(({ layerType }) => layerType === layerTypes.DATA) // remove non chart layers
      .map(async (layer) => {
        const { icon, label } = getVisType(layer);
        try {
          const { fields, splitField } = await extractFields(layer, vis, dataViewClient);
          const detectors = createDetectors(fields, splitField);
          const createdBy =
            splitField || detectors.length > 1
              ? CREATED_BY_LABEL.MULTI_METRIC
              : CREATED_BY_LABEL.SINGLE_METRIC;

          return {
            id: layer.layerId,
            layerType: layer.layerType,
            label,
            icon,
            jobWizardType: createdBy,
            isCompatible: true,
          };
        } catch (error) {
          return {
            id: layer.layerId,
            layerType: layer.layerType,
            label,
            icon,
            jobWizardType: null,
            isCompatible: false,
            error,
          };
        }
      })
  );

  return layers;
}

async function createADJobFromLensSavedObject(
  vis: LensSavedObjectAttributes,
  query: Query,
  filters: Filter[],
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient,
  layerIndex?: number
) {
  const visualization = vis.state.visualization as { layers: XYDataLayerConfig[] };

  const compatibleLayers = visualization.layers.filter(isCompatibleLayer);

  const selectedLayer =
    layerIndex !== undefined ? visualization.layers[layerIndex] : compatibleLayers[0];

  const { fields, timeField, splitField, dataView } = await extractFields(
    selectedLayer,
    vis,
    dataViewClient
  );

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

async function extractFields(
  layer: XYLayerConfig,
  vis: LensSavedObjectAttributes,
  dataViewClient: DataViewsContract
) {
  if (!isCompatibleLayer(layer)) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.incompatibleLayerType', {
        defaultMessage: 'Layer is incompatible. Only chart layers can be used.',
      })
    );
  }

  const indexpattern = vis.state.datasourceStates.indexpattern as IndexPatternPersistedState;
  const compatibleIndexPatternLayer = Object.entries(indexpattern.layers).find(
    ([id]) => layer.layerId === id
  );
  if (compatibleIndexPatternLayer === undefined) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noCompatibleLayers', {
        defaultMessage:
          'Visualization does not contain any layers which can be used for creating an anomaly detection job.',
      })
    );
  }

  const [layerId, columnsLayer] = compatibleIndexPatternLayer;

  const columns = getColumns(columnsLayer, layer);
  const timeField = Object.values(columns).find(({ dataType }) => dataType === 'date');
  if (timeField === undefined) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noDateField', {
        defaultMessage: 'Cannot find a date field.',
      })
    );
  }

  const fields = layer.accessors.map((a) => columns[a]);

  const splitField = layer.splitAccessor ? columns[layer.splitAccessor] : null;

  if (
    splitField !== null &&
    isTermsField(splitField) &&
    splitField.params.secondaryFields?.length
  ) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.splitFieldHasMultipleFields', {
        defaultMessage: 'Selected split field contains more than one field.',
      })
    );
  }

  if (splitField !== null && isCompatibleSplitFieldType(splitField) === false) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.splitFieldMustBeString', {
        defaultMessage: 'Selected split field type must be string.',
      })
    );
  }

  const dataView = await getDataViewFromLens(vis.references, layerId, dataViewClient);
  if (dataView === null) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noDataViews', {
        defaultMessage: 'No data views can be found in the visualization.',
      })
    );
  }

  if (timeField.sourceField !== dataView.timeFieldName) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.timeFieldNotInDataView', {
        defaultMessage:
          'Selected time field must be the default time field configured for data view.',
      })
    );
  }

  return { fields, timeField, splitField, dataView };
}

function createDetectors(
  fields: FieldBasedIndexPatternColumn[],
  splitField: FieldBasedIndexPatternColumn | null
) {
  return fields.map(({ operationType, sourceField }) => {
    return {
      function: getMlFunction(operationType),
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

function getColumns(
  { columns }: Omit<IndexPatternLayer, 'indexPatternId'>,
  layer: XYDataLayerConfig
) {
  layer.accessors.forEach((a) => {
    const col = columns[a];
    // fail early if any of the cols being used as accessors
    // contain functions we don't support
    return col.dataType !== 'date' && getMlFunction(col.operationType);
  });

  if (Object.values(columns).some((c) => hasSourceField(c) === false)) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.colsNoSourceField', {
        defaultMessage: 'Some columns do not contain a source field.',
      })
    );
  }

  if (Object.values(columns).some((c) => hasIncompatibleProperties(c) === true)) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.colsUsingFilterTimeSift', {
        defaultMessage:
          'Columns contain settings which are incompatible with ML detectors, time shift and filter by are not supported.',
      })
    );
  }

  return columns as Record<string, FieldBasedIndexPatternColumn>;
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

  const mergedQueries = mergeWith(
    dashboardQueries,
    visQueries,
    (objValue: estypes.QueryDslQueryContainer, srcValue: estypes.QueryDslQueryContainer) => {
      if (Array.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    }
  );

  return mergedQueries;
}
