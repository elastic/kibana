/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery } from '@kbn/observability-plugin/server/utils/queries';
import { extractIndexNameFromBackingIndex } from '../../../common/utils';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import { _IGNORED } from '../../../common/es_fields';
import { DataStreamType } from '../../../common/types';
import { createDatasetQualityESClient } from '../../utils';

export async function getNonAggregatableDataStreams({
  esClient,
  type = DEFAULT_DATASET_TYPE,
  start,
  end,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  start: number;
  end: number;
  dataStream?: string;
}) {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const response = await datasetQualityESClient.fieldCaps({
    index: dataStream ?? `${type}-*-*`,
    fields: [_IGNORED],
    index_filter: {
      ...rangeQuery(start, end)[0],
    },
  });

  const ignoredField = response.fields._ignored?._ignored;

  const nonAggregatableIndices = ignoredField?.non_aggregatable_indices ?? [];

  const nonAggregatableDatasets = new Set(
    (Array.isArray(nonAggregatableIndices) ? nonAggregatableIndices : [nonAggregatableIndices]).map(
      extractIndexNameFromBackingIndex
    )
  );

  return {
    aggregatable: ignoredField?.aggregatable ?? true,
    datasets: Array.from(nonAggregatableDatasets),
  };
}
