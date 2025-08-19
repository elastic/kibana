/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { last } from 'lodash';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { APMConfig } from '../..';
import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_ID,
  ERROR_LOG_LEVEL,
  ERROR_LOG_MESSAGE,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  TIMESTAMP_US,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import type {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../common/waterfall/typings';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getSpanLinksCountById } from '../span_links/get_linked_children';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import { getTraceDocsPerPage } from './get_trace_docs_per_page';

export type TraceDoc = WaterfallTransaction | WaterfallSpan;

export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: TraceDoc[];
  errorDocs: WaterfallError[];
  spanLinksCountById: Record<string, number>;
  traceDocsTotal: number;
  maxTraceItems: number;
}

export const requiredFields = asMutableArray([
  TIMESTAMP_US,
  TRACE_ID,
  SERVICE_NAME,
  ERROR_ID,
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
] as const);

export const optionalFields = asMutableArray([
  PARENT_ID,
  TRANSACTION_ID,
  SPAN_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  ERROR_CULPRIT,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_HANDLED,
  ERROR_EXC_TYPE,
] as const);

export async function getTraceItems({
  traceId,
  config,
  apmEventClient,
  start,
  end,
  maxTraceItemsFromUrlParam,
  logger,
}: {
  traceId: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  maxTraceItemsFromUrlParam?: number;
  logger: Logger;
}): Promise<TraceItems> {
  const maxTraceItems = maxTraceItemsFromUrlParam ?? config.ui.maxTraceItems;

  const errorResponsePromise = getApmTraceError({
    apmEventClient,
    traceId,
    start,
    end,
  });

  const traceResponsePromise = getTraceDocsPaginated({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    logger,
  });

  const [errorDocs, traceResponse, spanLinksCountById] = await Promise.all([
    errorResponsePromise,
    traceResponsePromise,
    getSpanLinksCountById({ traceId, apmEventClient, start, end }),
  ]);

  const traceDocsTotal = traceResponse.total;
  const exceedsMax = traceDocsTotal > maxTraceItems;

  const traceDocs = traceResponse.hits.map(({ hit }) => hit);

  return {
    exceedsMax,
    traceDocs,
    errorDocs,
    spanLinksCountById,
    traceDocsTotal,
    maxTraceItems,
  };
}

export const MAX_ITEMS_PER_PAGE = 10000; // 10000 is the max allowed by ES
const excludedLogLevels = ['debug', 'info', 'warning'];

export async function getApmTraceError({
  apmEventClient,
  traceId,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  start: number;
  end: number;
}) {
  const response = await apmEventClient.search('get_errors_docs', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    track_total_hits: false,
    size: 1000,
    query: {
      bool: {
        filter: [{ term: { [TRACE_ID]: traceId } }, ...rangeQuery(start, end)],
        must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
      },
    },
    fields: [...requiredFields, ...optionalFields],
    _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_HANDLED, ERROR_EXC_TYPE],
  });

  return response.hits.hits.map((hit) => {
    const errorSource = 'error' in hit._source ? hit._source : undefined;

    const event = unflattenKnownApmEventFields(hit.fields, requiredFields);

    const waterfallErrorEvent: WaterfallError = {
      ...event,
      parent: {
        ...event?.parent,
        id: event?.parent?.id ?? event?.span?.id,
      },
      error: {
        ...(event.error ?? {}),
        exception:
          (errorSource?.error.exception?.length ?? 0) > 0
            ? errorSource?.error.exception
            : event?.error.exception && [event.error.exception],
        log: errorSource?.error.log,
      },
    };

    return waterfallErrorEvent;
  });
}

async function getTraceDocsPaginated({
  apmEventClient,
  maxTraceItems,
  traceId,
  start,
  end,
  hits = [],
  searchAfter,
  logger,
}: {
  apmEventClient: APMEventClient;
  maxTraceItems: number;
  traceId: string;
  start: number;
  end: number;
  logger: Logger;
  hits?: Awaited<ReturnType<typeof getTraceDocsPerPage>>['hits'];
  searchAfter?: SortResults;
}): ReturnType<typeof getTraceDocsPerPage> {
  const response = await getTraceDocsPerPage({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    searchAfter,
  });

  const mergedHits = [...hits, ...response.hits];

  logger.debug(
    `Paginating traces: retrieved: ${response.hits.length}, (total: ${mergedHits.length} of ${response.total}), maxTraceItems: ${maxTraceItems}`
  );

  if (
    mergedHits.length >= maxTraceItems ||
    mergedHits.length >= response.total ||
    mergedHits.length === 0 ||
    response.hits.length < MAX_ITEMS_PER_PAGE
  ) {
    return {
      hits: mergedHits,
      total: response.total,
    };
  }

  return getTraceDocsPaginated({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    hits: mergedHits,
    searchAfter: last(response.hits)?.sort,
    logger,
  });
}
