/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { SimpleSavedObject } from 'kibana/public';

import type {
  LensSavedObjectAttributes,
  GenericIndexPatternColumn,
  XYDataLayerConfig,
} from '../../../../../../../lens/public';
import { getUiSettings, getDataViews } from '../../../../util/dependency_cache';

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
  so: SimpleSavedObject<LensSavedObjectAttributes>,
  startString: string,
  endString: string,
  query: any,
  filters: any
) {
  const dataView = await getDataViewFromLens(so);
  if (dataView === null) {
    return;
  }
  // debugger;

  // so.attributes.state.datasourceStates.indexpattern.layers['a12346a9-31fc-495c-87f1-91dedd4f8fba']
  //   .columns;
  // @ts-expect-error
  const state = so.attributes?.state ?? so.state;
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

  const { columns } = layer as { columns: Record<string, GenericIndexPatternColumn> };
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
    getUiSettings()
  );
  datafeedConfig.query = combinedQuery;

  // datafeedConfig.query = {
  //   bool: {
  //     must: [
  //       {
  //         match_all: {},
  //       },
  //     ],
  //   },
  // };

  jobConfig.analysis_config.detectors = fields.map((f) => {
    return {
      function: lensOperationToMlFunction(f.operationType),
      // @ts-expect-error sourceField missing in type
      field_name: f.sourceField,
      // @ts-expect-error sourceField missing in type
      ...(splitField ? { partition_field_name: splitField.sourceField } : {}),
    };
  });
  // @ts-expect-error sourceField missing in type
  jobConfig.data_description.time_field = timeField.sourceField;
  jobConfig.analysis_config.bucket_span = '15m';
  if (splitField) {
    // @ts-expect-error sourceField missing in type
    jobConfig.analysis_config.influencers = [splitField.sourceField];
  }

  const createdBy =
    splitField || jobConfig.analysis_config.detectors.length > 1
      ? CREATED_BY_LABEL.MULTI_METRIC
      : CREATED_BY_LABEL.SINGLE_METRIC;
  const start = moment(startString).valueOf();
  const end = moment(endString).valueOf();

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

async function getDataViewFromLens(so: SimpleSavedObject<LensSavedObjectAttributes>) {
  const dataViewClient = getDataViews();

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

    default:
      return op;
  }
}
