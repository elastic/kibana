/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import { APMEventClient } from './create_es_client/create_apm_event_client';
import { getConfigForDocumentType } from './create_es_client/document_type';
import { TRANSACTION_DURATION_SUMMARY } from '../../../common/es_fields/apm';
import { TimeRangeMetadata } from '../../../common/time_range_metadata';

const getFilters = ({
  documentType,
  rollupInterval,
  filters,
}: {
  documentType: ApmDocumentType;
  rollupInterval: RollupInterval;
  filters: estypes.QueryDslQueryContainer[];
}) => {
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
    ...searchParams,
    body: {
      ...searchParams.body,
      query: {
        bool: {
          filter: filters,
        },
      },
    },
  };
};

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
      return {
        documentType,
        rollupInterval,
        meta: {
          checkSummaryExistsField: false,
        },
        before: getFilters({
          documentType,
          rollupInterval,
          filters: [...kql, ...beforeRange],
        }),
        current: getFilters({
          documentType,
          rollupInterval,
          filters: [...kql, ...currentRange],
        }),
      };
    });
  });

  const sourcesToCheckWithSummary = [
    ApmDocumentType.TransactionMetric as const,
  ].flatMap((documentType) => {
    const docTypeConfig = getConfigForDocumentType(documentType);

    return (
      enableContinuousRollups
        ? docTypeConfig.rollupIntervals
        : [RollupInterval.OneMinute]
    ).flatMap((rollupInterval) => {
      const summaryExistsFilter = {
        bool: {
          filter: [
            {
              exists: {
                field: TRANSACTION_DURATION_SUMMARY,
              },
            },
          ],
        },
      };

      return {
        documentType,
        rollupInterval,
        meta: {
          checkSummaryExistsField: true,
        },
        before: getFilters({
          documentType,
          rollupInterval,
          filters: [...kql, ...beforeRange, summaryExistsFilter],
        }),
        current: getFilters({
          documentType,
          rollupInterval,
          filters: [...kql, ...currentRange, summaryExistsFilter],
        }),
      };
    });
  });

  const docSearches = sourcesToCheck.flatMap(({ before, current }) => [
    before,
    current,
  ]);

  const summaryFieldSearches = sourcesToCheckWithSummary.flatMap(
    ({ before, current }) => [before, current]
  );

  const allSourcesToCheck = [...sourcesToCheck, ...sourcesToCheckWithSummary];

  const allSearches = [...docSearches, ...summaryFieldSearches];

  const allResponses = (
    await apmEventClient.msearch('get_document_availability', ...allSearches)
  ).responses;

  const checkedSources = allSourcesToCheck.map((source, index) => {
    const { documentType, rollupInterval } = source;
    const responseBefore = allResponses[index * 2];
    const responseAfter = allResponses[index * 2 + 1];

    const hasDataBefore = responseBefore.hits.total.value > 0;
    const hasDataAfter = responseAfter.hits.total.value > 0;

    return {
      documentType,
      rollupInterval,
      hasDataBefore,
      hasDataAfter,
      checkSummaryExistsField: source.meta.checkSummaryExistsField,
    };
  });

  const hasAnyDataBefore = checkedSources
    .filter((source) => !source.checkSummaryExistsField)
    .some((source) => source.hasDataBefore);

  const sources: TimeRangeMetadata['sources'] = [];

  checkedSources.forEach((source) => {
    const {
      documentType,
      hasDataAfter,
      hasDataBefore,
      rollupInterval,
      checkSummaryExistsField,
    } = source;
    const hasData = hasDataBefore || hasDataAfter;
    const hasDocsData = hasAnyDataBefore ? hasDataBefore : hasData;

    if (documentType === ApmDocumentType.ServiceTransactionMetric) {
      sources.push({
        documentType,
        rollupInterval,
        // If there is any data before, we require that data is available before
        // this time range to mark this source as available. If we don't do that,
        // users that upgrade to a version that starts generating service tx metrics
        // will see a mostly empty screen for a while after upgrading.
        // If we only check before, users with a new deployment will use raw transaction
        // events.
        hasDocs: hasDocsData,
        isSummaryFieldAvailable: true,
      });
    }

    if (
      documentType === ApmDocumentType.TransactionMetric &&
      !checkSummaryExistsField
    ) {
      const equivalentSourceWithSummary = checkedSources.find(
        (eSource) =>
          eSource.documentType === documentType &&
          eSource.rollupInterval === rollupInterval &&
          eSource.checkSummaryExistsField
      );
      if (equivalentSourceWithSummary) {
        const hasSummaryData =
          equivalentSourceWithSummary.hasDataBefore ||
          equivalentSourceWithSummary.hasDataAfter;
        sources.push({
          documentType,
          rollupInterval,
          hasDocs: hasDocsData,
          isSummaryFieldAvailable: hasAnyDataBefore
            ? equivalentSourceWithSummary.hasDataBefore
            : hasSummaryData,
        });
      }
    }
  });

  return sources.concat({
    documentType: ApmDocumentType.TransactionEvent,
    rollupInterval: RollupInterval.None,
    hasDocs: true,
    isSummaryFieldAvailable: false,
  });
}
