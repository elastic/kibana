/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ApmDataSource } from '../../../common/data_source';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import { APMEventClient } from './create_es_client/create_apm_event_client';
import { getConfigForDocumentType } from './create_es_client/document_type';

export async function getDocumentSources({
  apmEventClient,
  start,
  end,
  kuery,
  enableServiceTransactionMetrics,
  enableContinuousRollups,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kuery: string;
  enableServiceTransactionMetrics: boolean;
  enableContinuousRollups: boolean;
}) {
  const currentRange = rangeQuery(start, end);
  const diff = end - start;
  const kql = kqlQuery(kuery);
  const beforeRange = rangeQuery(start - diff, end - diff);

  const sourcesToCheck = [
    ...(enableServiceTransactionMetrics
      ? [ApmDocumentType.ServiceTransactionMetric as const]
      : []),
    ApmDocumentType.TransactionMetric as const,
  ].flatMap((documentType) => {
    const docTypeConfig = getConfigForDocumentType(documentType);

    return (
      enableContinuousRollups
        ? docTypeConfig.rollupIntervals
        : [RollupInterval.OneMinute]
    ).flatMap((rollupInterval) => {
      const searchParams = {
        apm: {
          sources: [
            {
              documentType,
              rollupInterval,
            },
          ],
        },
        body: {
          track_total_hits: 1,
          size: 0,
          terminate_after: 1,
        },
      };

      return {
        documentType,
        rollupInterval,
        before: {
          ...searchParams,
          body: {
            ...searchParams.body,
            query: {
              bool: {
                filter: [...kql, ...beforeRange],
              },
            },
          },
        },
        current: {
          ...searchParams,
          body: {
            ...searchParams.body,
            query: {
              bool: {
                filter: [...kql, ...currentRange],
              },
            },
          },
        },
      };
    });
  });

  const allSearches = sourcesToCheck.flatMap(({ before, current }) => [
    before,
    current,
  ]);

  const allResponses = (
    await apmEventClient.msearch('get_document_availability', ...allSearches)
  ).responses;

  const checkedSources = sourcesToCheck.map((source, index) => {
    const responseBefore = allResponses[index * 2];
    const responseAfter = allResponses[index * 2 + 1];
    const { documentType, rollupInterval } = source;

    const hasDataBefore = responseBefore.hits.total.value > 0;
    const hasDataAfter = responseAfter.hits.total.value > 0;

    return {
      documentType,
      rollupInterval,
      hasDataBefore,
      hasDataAfter,
    };
  });

  const hasAnyDataBefore = checkedSources.some(
    (source) => source.hasDataBefore
  );

  const sources: Array<ApmDataSource & { hasDocs: boolean }> =
    checkedSources.map((source) => {
      const { documentType, hasDataAfter, hasDataBefore, rollupInterval } =
        source;

      const hasData = hasDataBefore || hasDataAfter;

      return {
        documentType,
        rollupInterval,
        // If there is any data before, we require that data is available before
        // this time range to mark this source as available. If we don't do that,
        // users that upgrade to a version that starts generating service tx metrics
        // will see a mostly empty screen for a while after upgrading.
        // If we only check before, users with a new deployment will use raw transaction
        // events.
        hasDocs: hasAnyDataBefore ? hasDataBefore : hasData,
      };
    });

  return sources.concat({
    documentType: ApmDocumentType.TransactionEvent,
    rollupInterval: RollupInterval.None,
    hasDocs: true,
  });
}
