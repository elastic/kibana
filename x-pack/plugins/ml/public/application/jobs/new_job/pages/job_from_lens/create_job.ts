/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { SimpleSavedObject, IUiSettingsClient } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';

import type {
  LensSavedObjectAttributes,
  FieldBasedIndexPatternColumn,
  XYDataLayerConfig,
} from '@kbn/lens-plugin/public';

import { createEmptyJob, createEmptyDatafeed } from '../../common/job_creator/util/default_configs';
import { stashJobForCloning } from '../../common/job_creator/util/general';
import { JobCreatorType } from '../../common/job_creator';
import { CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';
import { createQueries } from '../../utils/new_job_utils';

const COMPATIBLE_LAYER_TYPES = [
  'line',
  'bar',
  'bar_stacked',
  'bar_percentage_stacked',
  'area',
  'area_stacked',
  'area_percentage_stacked',
];

export async function createADJobFromLensSavedObject(
  vis: SimpleSavedObject<LensSavedObjectAttributes>,
  startString: string,
  endString: string,
  query: any,
  filters: any,
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient
) {
  const dataView = await getDataViewFromLens(vis, dataViewClient);
  if (dataView === null) {
    return;
  }
  // debugger;

  // so.attributes.state.datasourceStates.indexpattern.layers['a12346a9-31fc-495c-87f1-91dedd4f8fba']
  //   .columns;
  // debugger;
  // @ts-expect-error
  const state = vis.attributes?.state ?? vis.state;
  const visualization = state.visualization as { layers: XYDataLayerConfig[] };
  const compatibleLayers = visualization.layers.filter((l) =>
    COMPATIBLE_LAYER_TYPES.includes(l.seriesType)
  );

  const compatibleLayerIds = compatibleLayers.map((l) => l.layerId);

  const indexpattern: any = state.datasourceStates.indexpattern;
  const [layer] = Object.entries(indexpattern.layers)
    .filter(([id]) => compatibleLayerIds.includes(id))
    .map(([, l]) => l);

  if (layer === undefined) {
    return;
  }

  const { columns } = layer as { columns: Record<string, FieldBasedIndexPatternColumn> };
  const cols = Object.entries(columns);
  const timeFieldCol = cols.find(([, c]) => c.dataType === 'date');
  if (timeFieldCol === undefined) {
    return;
  }
  const [, timeField] = timeFieldCol;

  const [firstCompatibleLayer] = compatibleLayers;
  const fields = firstCompatibleLayer.accessors.map((a) => columns[a]);

  const splitField = firstCompatibleLayer.splitAccessor
    ? columns[firstCompatibleLayer.splitAccessor]
    : null;

  const jobConfig = createEmptyJob();
  const datafeedConfig = createEmptyDatafeed(dataView.title);

  const mainQuery = query?.query !== '' ? query : state.query;

  const { combinedQuery } = createQueries(
    { query: mainQuery, filter: filters },
    dataView,
    kibanaConfig
  );
  datafeedConfig.query = combinedQuery;

  jobConfig.analysis_config.detectors = fields.map(({ operationType, sourceField }) => {
    const func = lensOperationToMlFunction(operationType);
    if (func === null) {
      throw Error('');
    }
    return {
      function: func,
      field_name: sourceField,
      ...(splitField ? { partition_field_name: splitField.sourceField } : {}),
    };
  });

  jobConfig.data_description.time_field = timeField.sourceField;
  jobConfig.analysis_config.bucket_span = '15m';
  if (splitField) {
    jobConfig.analysis_config.influencers = [splitField.sourceField];
  }

  const createdBy =
    splitField || jobConfig.analysis_config.detectors.length > 1
      ? CREATED_BY_LABEL.MULTI_METRIC
      : CREATED_BY_LABEL.SINGLE_METRIC;
  const start = moment(startString).valueOf();
  const end = moment(endString).valueOf();

  return {
    jobConfig,
    datafeedConfig,
    createdBy,
    start,
    end,
  };
}

export async function canCreateAndStashADJob(
  vis: SimpleSavedObject<LensSavedObjectAttributes>,
  startString: string,
  endString: string,
  query: any,
  filters: any,
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient
) {
  const jobItems = await createADJobFromLensSavedObject(
    vis,
    startString,
    endString,
    query,
    filters,
    dataViewClient,
    kibanaConfig
  );
  if (!jobItems) {
    return;
  }

  const { jobConfig, datafeedConfig, createdBy, start, end } = jobItems;
  stashJobForCloning(
    {
      jobConfig,
      datafeedConfig,
      createdBy,
      start,
      end,
    } as JobCreatorType,
    true,
    true
  );
}

export async function canCreateADJob(
  vis: SimpleSavedObject<LensSavedObjectAttributes>,
  startString: string,
  endString: string,
  query: any,
  filters: any,
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient
) {
  try {
    const jobItems = await createADJobFromLensSavedObject(
      vis,
      startString,
      endString,
      query,
      filters,
      dataViewClient,
      kibanaConfig
    );

    return !!jobItems;
  } catch (error) {
    return false;
  }
}

async function getDataViewFromLens(
  so: SimpleSavedObject<LensSavedObjectAttributes>,
  dataViewClient: DataViewsContract
) {
  const dv = so.references.find((r) => r.type === 'index-pattern');
  if (!dv) {
    return null;
  }
  return dataViewClient.get(dv.id);
}

function lensOperationToMlFunction(op: string) {
  switch (op) {
    case 'average':
      return 'mean';
    case 'count':
      return 'count';
    case 'max':
      return 'max';
    case 'median':
      return 'median';
    case 'min':
      return 'min';
    case 'sum':
      return 'sum';
    case 'unique_count':
      return 'distinct_count';

    default:
      return null;
  }
}

export function getJobsItemsFromEmbeddable(embeddable: IEmbeddable) {
  const {
    query,
    filters,
    timeRange: { from, to },
    // @ts-expect-error input not in type
  } = embeddable.input;
  // @ts-expect-error savedVis not in type
  const vis = embeddable.savedVis;

  return {
    vis,
    from,
    to,
    query,
    filters,
  } as {
    vis: SimpleSavedObject<LensSavedObjectAttributes>;
    from: string;
    to: string;
    query: any;
    filters: any;
  };
}
