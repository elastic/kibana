/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq, pickBy, sumBy, keyBy } from 'lodash';
import { IlmExplainLifecycleLifecycleExplainManaged } from '@elastic/elasticsearch/lib/api/types';
import { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { Setup } from '../../../lib/helpers/setup_request';
import { ApmPluginRequestHandlerContext } from '../../typings';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';

export async function getIndicesStats({
  context,
  setup,
  indexLifecyclePhase,
}: {
  context: ApmPluginRequestHandlerContext;
  setup: Setup;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}) {
  const {
    indices: { transaction, span, metric, error },
  } = setup;

  const index = uniq([transaction, span, metric, error]).join();
  const esClient = (await context.core).elasticsearch.client;

  const indicesStats = await esClient.asCurrentUser.indices.stats({ index });

  const indicesForLifecyclePhase = await getApmIndicesForIndexLifecyclePhase({
    context,
    index,
    indexLifecyclePhase,
  });

  const indicesForLifecyclePhaseStats = Object.values(
    pickBy(indicesStats.indices, (value, key) => {
      return key in indicesForLifecyclePhase;
    })
  );

  return {
    totalApmDocs: sumBy(
      indicesForLifecyclePhaseStats,
      (o) => o.total?.docs?.count ?? 0
    ),
    totalSizeInBytes: sumBy(
      indicesForLifecyclePhaseStats,
      (o) => o.total?.store?.size_in_bytes ?? 0
    ),
  };
}

async function getApmIndicesForIndexLifecyclePhase({
  context,
  index,
  indexLifecyclePhase,
}: {
  context: ApmPluginRequestHandlerContext;
  index: string;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}) {
  const esClient = (await context.core).elasticsearch.client;
  const { indices } = await esClient.asCurrentUser.ilm.explainLifecycle({
    index,
  });

  const filteredApmIndices = Object.values(indices)
    .filter(
      (idx) =>
        (idx as IlmExplainLifecycleLifecycleExplainManaged).phase ===
        indexLifecyclePhase
    )
    .map((idx) => idx.index);

  return keyBy(filteredApmIndices);
}

export async function getTotalIndicesStats({
  context,
  setup,
}: {
  context: ApmPluginRequestHandlerContext;
  setup: Setup;
}) {
  const {
    indices: { transaction, span, metric, error },
  } = setup;
  const index = uniq([transaction, span, metric, error]).join();
  const esClient = (await context.core).elasticsearch.client;
  const indicesStats = (await esClient.asCurrentUser.indices.stats({ index }))
    .indices;

  return indicesStats;
}

export function getEstimatedSizeForDocumentsInIndex({
  allIndicesStats,
  indexName,
  numberOfDocs,
}: {
  allIndicesStats: Record<string, IndicesStatsIndicesStats>;
  indexName: string;
  numberOfDocs: number;
}) {
  const indexStats = allIndicesStats[indexName];
  const indexTotalSize = indexStats?.total?.store?.size_in_bytes ?? 0;
  const indexTotalDocCount = indexStats?.total?.docs?.count;

  const estimatedSize = indexTotalDocCount
    ? (numberOfDocs / indexTotalDocCount) * indexTotalSize
    : 0;

  return estimatedSize;
}
