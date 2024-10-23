/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RollupInterval } from '../../../common/rollup';
import { TimeRangeMetadata } from '../../../common/time_range_metadata';
import { isDurationSummaryNotSupportedFilter } from '../../lib/helpers/transactions';
import { ApmDocumentType } from '../../../common/document_type';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getConfigForDocumentType } from '../../lib/helpers/create_es_client/document_type';

const QUERY_INDEX = {
  DOCUMENT_TYPE: 0,
  DURATION_SUMMARY_NOT_SUPPORTED: 1,
} as const;

export interface DocumentSourcesRequest {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kuery: string;
  enableServiceTransactionMetrics: boolean;
  enableContinuousRollups: boolean;
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
    ...(enableServiceTransactionMetrics ? [ApmDocumentType.ServiceTransactionMetric as const] : []),
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

  return [
    ...documentTypesInfo,
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
}): Promise<TimeRangeMetadata['sources']> => {
  const getRequests = getDocumentTypeRequestsFn({
    enableContinuousRollups,
    start,
    end,
    kuery,
  });

  const sourceRequests = documentTypesToCheck.flatMap(getRequests);

  const allSearches = sourceRequests
    .flatMap(({ documentTypeQuery, durationSummaryNotSupportedQuery }) => [
      documentTypeQuery,
      durationSummaryNotSupportedQuery,
    ])
    .filter((request): request is ReturnType<typeof getRequest> => request !== undefined);

  const allResponses = (await apmEventClient.msearch('get_document_availability', ...allSearches))
    .responses;

  const hasAnyLegacyDocuments = sourceRequests.some(
    ({ documentType, rollupInterval }, index) =>
      isLegacyDocType(documentType, rollupInterval) &&
      allResponses[index + QUERY_INDEX.DURATION_SUMMARY_NOT_SUPPORTED].hits.total.value > 0
  );

  return sourceRequests.map(({ documentType, rollupInterval, ...queries }) => {
    const numberOfQueries = Object.values(queries).filter(Boolean).length;
    // allResponses is sorted by the order of the requests in sourceRequests
    const docTypeResponses = allResponses.splice(0, numberOfQueries);
    const hasDocs = docTypeResponses[QUERY_INDEX.DOCUMENT_TYPE].hits.total.value > 0;
    // can only use >=8.7 document types (ServiceTransactionMetrics or TransactionMetrics with 10m and 60m intervals)
    // if there are no legacy documents
    const canUseContinousRollupDocs = hasDocs && !hasAnyLegacyDocuments;

    return {
      documentType,
      rollupInterval,
      hasDocs: isLegacyDocType(documentType, rollupInterval) ? hasDocs : canUseContinousRollupDocs,
      // all >=8.7 document types with rollups support duration summary
      hasDurationSummaryField: canUseContinousRollupDocs,
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
    const kql = kqlQuery(kuery);

    const rollupIntervals = enableContinuousRollups
      ? getConfigForDocumentType(documentType).rollupIntervals
      : [RollupInterval.OneMinute];

    return rollupIntervals.map((rollupInterval) => ({
      documentType,
      rollupInterval,
      documentTypeQuery: getRequest({
        documentType,
        rollupInterval,
        filters: [...kql, ...currentRange],
      }),
      ...(isLegacyDocType(documentType, rollupInterval)
        ? {
            durationSummaryNotSupportedQuery: getRequest({
              documentType,
              rollupInterval,
              filters: [...kql, ...currentRange, isDurationSummaryNotSupportedFilter()],
            }),
          }
        : undefined),
    }));
  };

const isLegacyDocType = (documentType: ApmDocumentType, rollupInterval: RollupInterval) => {
  return (
    documentType === ApmDocumentType.TransactionMetric &&
    rollupInterval === RollupInterval.OneMinute
  );
};
