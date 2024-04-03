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
import { TimeRangeMetadata } from '../../../common/time_range_metadata';
import { getDurationLegacyFilter } from './transactions';

const QUERY_INDEX = {
  BEFORE: 0,
  CURRENT: 1,
  DURATION_SUMMARY: 2,
} as const;

interface DocumentTypeData {
  documentType: ApmDocumentType;
  rollupInterval: RollupInterval;
  hasDocBefore: boolean;
  hasDocAfter: boolean;
  allHaveDurationSummary: boolean;
}

const getRequest = ({
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
}): Promise<TimeRangeMetadata['sources']> {
  const documentTypesToCheck = [
    ...(enableServiceTransactionMetrics
      ? [ApmDocumentType.ServiceTransactionMetric as const]
      : []),
    ApmDocumentType.TransactionMetric as const,
  ];

  const documentTypesInfo = await getDocumentTypesInfo({
    apmEventClient,
    start,
    end,
    kuery,
    enableContinuousRollups,
    documentTypesToCheck,
  });

  const hasAnySourceDocBefore = documentTypesInfo.some(
    (source) => source.hasDocBefore
  );

  return [
    ...mapToSources(documentTypesInfo, hasAnySourceDocBefore),
    {
      documentType: ApmDocumentType.TransactionEvent,
      rollupInterval: RollupInterval.None,
      hasDocs: true,
      hasDurationSummaryField: false,
    },
  ];
}

const getDocumentTypesInfo = async ({
  apmEventClient,
  start,
  end,
  kuery,
  enableContinuousRollups,
  documentTypesToCheck,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kuery: string;
  enableContinuousRollups: boolean;
  documentTypesToCheck: ApmDocumentType[];
}) => {
  const getRequests = getDocumentTypeRequestsFn({
    enableContinuousRollups,
    start,
    end,
    kuery,
  });

  const sourceRequests = documentTypesToCheck.flatMap(getRequests);

  const allSearches = sourceRequests
    .flatMap(({ before, current, durationSummaryCheck }) => [
      before,
      current,
      durationSummaryCheck,
    ])
    .filter(
      (request): request is ReturnType<typeof getRequest> =>
        request !== undefined
    );

  const allResponses = (
    await apmEventClient.msearch('get_document_availability', ...allSearches)
  ).responses;

  return sourceRequests.map(({ documentType, rollupInterval, ...queries }) => {
    const numberOfQueries = Object.values(queries).filter(Boolean).length;
    // allResponses is sorted by the order of the requests in sourceRequests
    const docTypeResponses = allResponses.splice(0, numberOfQueries);

    return {
      documentType,
      rollupInterval,
      hasDocBefore: docTypeResponses[QUERY_INDEX.BEFORE].hits.total.value > 0,
      hasDocAfter: docTypeResponses[QUERY_INDEX.CURRENT].hits.total.value > 0,
      allHaveDurationSummary: docTypeResponses[QUERY_INDEX.DURATION_SUMMARY]
        ? docTypeResponses[QUERY_INDEX.DURATION_SUMMARY].hits.total.value === 0
        : true,
    };
  });
};

const getDocumentTypeRequestsFn =
  ({
    enableContinuousRollups,
    start,
    end,
    kuery,
  }: {
    enableContinuousRollups: boolean;
    start: number;
    end: number;
    kuery: string;
  }) =>
  (documentType: ApmDocumentType) => {
    const currentRange = rangeQuery(start, end);
    const diff = end - start;
    const kql = kqlQuery(kuery);
    const beforeRange = rangeQuery(start - diff, end - diff);

    const rollupIntervals = enableContinuousRollups
      ? getConfigForDocumentType(documentType).rollupIntervals
      : [RollupInterval.OneMinute];

    return rollupIntervals.map((rollupInterval) => ({
      documentType,
      rollupInterval,
      before: getRequest({
        documentType,
        rollupInterval,
        filters: [...kql, ...beforeRange],
      }),
      current: getRequest({
        documentType,
        rollupInterval,
        filters: [...kql, ...currentRange],
      }),
      ...(documentType !== ApmDocumentType.ServiceTransactionMetric
        ? {
            durationSummaryCheck: getRequest({
              documentType,
              rollupInterval,
              filters: [...kql, ...currentRange, getDurationLegacyFilter()],
            }),
          }
        : {}),
    }));
  };

const mapToSources = (
  sources: DocumentTypeData[],
  hasAnySourceDocBefore: boolean
) => {
  return sources.map((source) => {
    const {
      documentType,
      hasDocAfter,
      hasDocBefore,
      rollupInterval,
      allHaveDurationSummary,
    } = source;

    const hasDocBeforeOrAfter = hasDocBefore || hasDocAfter;

    // If there is any data before, we require that data is available before
    // this time range to mark this source as available. If we don't do that,
    // users that upgrade to a version that starts generating service tx metrics
    // will see a mostly empty screen for a while after upgrading.
    // If we only check before, users with a new deployment will use raw transaction
    // events.
    const hasDocs = hasAnySourceDocBefore ? hasDocBefore : hasDocBeforeOrAfter;

    return {
      documentType,
      rollupInterval,
      hasDocs,
      hasDurationSummaryField: allHaveDurationSummary,
    };
  });
};
