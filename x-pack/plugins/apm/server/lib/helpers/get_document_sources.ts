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
}) {
  const currentRange = rangeQuery(start, end);
  const diff = end - start;
  const kql = kqlQuery(kuery);
  const beforeRange = rangeQuery(start - diff, end - diff);
  const documentTypesToCheck = [
    ...(enableServiceTransactionMetrics
      ? [ApmDocumentType.ServiceTransactionMetric as const]
      : []),
    ApmDocumentType.TransactionMetric as const,
  ];

  const sourcesToCheck = documentTypesToCheck.flatMap((documentType) => {
    const docTypeConfig = getConfigForDocumentType(documentType);

    return (
      enableContinuousRollups
        ? docTypeConfig.rollupIntervals
        : [RollupInterval.OneMinute]
    ).flatMap((rollupInterval) => {
      return {
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
    const { documentType, rollupInterval } = source;
    const responseBefore = allResponses[index * 2];
    const responseAfter = allResponses[index * 2 + 1];

    const hasDocBefore = responseBefore.hits.total.value > 0;
    const hasDocAfter = responseAfter.hits.total.value > 0;

    return {
      documentType,
      rollupInterval,
      hasDocBefore,
      hasDocAfter,
    };
  });

  const hasAnySourceDocBefore = checkedSources.some(
    (source) => source.hasDocBefore
  );

  const sourcesWithHasDocs = checkedSources.map((checkedSource) => {
    const { documentType, hasDocAfter, hasDocBefore, rollupInterval } =
      checkedSource;

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
    };
  });

  const durationSummarySupport = await getDurationSummarySupportByDocType({
    apmEventClient,
    documentTypes: documentTypesToCheck,
    enableContinuousRollups,
    filters: [...kql, ...currentRange],
  });

  const sources: TimeRangeMetadata['sources'] = sourcesWithHasDocs.map(
    (checkedSource) => {
      const { documentType, hasDocs, rollupInterval } = checkedSource;

      const hasDurationSummaryField =
        documentType in durationSummarySupport
          ? durationSummarySupport[documentType][rollupInterval] || false
          : false;

      return {
        documentType,
        rollupInterval,
        hasDocs,
        hasDurationSummaryField,
      };
    }
  );

  return sources.concat({
    documentType: ApmDocumentType.TransactionEvent,
    rollupInterval: RollupInterval.None,
    hasDocs: true,
    hasDurationSummaryField: false,
  });
}

async function getDurationSummarySupportByDocType({
  apmEventClient,
  documentTypes,
  filters,
  enableContinuousRollups,
}: {
  apmEventClient: APMEventClient;
  documentTypes: ApmDocumentType[];
  filters: estypes.QueryDslQueryContainer[];
  enableContinuousRollups: boolean;
}) {
  const sources = documentTypes.flatMap((documentType) => {
    const docTypeConfig = getConfigForDocumentType(documentType);

    return (
      enableContinuousRollups
        ? docTypeConfig.rollupIntervals
        : [RollupInterval.OneMinute]
    ).flatMap((rollupInterval) => ({
      documentType,
      rollupInterval,
      query: getRequest({
        documentType,
        rollupInterval,
        filters: [...filters, getDurationLegacyFilter()],
      }),
    }));
  });

  const allResponses = (
    await apmEventClient.msearch(
      'get_duration_summary_support',
      ...sources.map((source) => source.query)
    )
  ).responses;

  return sources.reduce(
    (acc, curr, index) => ({
      ...acc,
      [curr.documentType]: {
        ...acc[curr.documentType],
        [curr.rollupInterval]: allResponses[index].hits.total.value === 0,
      },
    }),
    {} as { [key: string]: { [key: string]: boolean } }
  );
}
