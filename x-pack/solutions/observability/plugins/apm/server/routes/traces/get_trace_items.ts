/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { type Error } from '@kbn/apm-types';
import type { Logger } from '@kbn/logging';
import { last } from 'lodash';
import type { APMConfig } from '../..';
import type { WaterfallSpan, WaterfallTransaction } from '../../../common/waterfall/typings';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { compactMap } from '../../utils/compact_map';
import { getSpanLinksCountById } from '../span_links/get_linked_children';
import { getApmTraceErrorQuery, requiredFields } from './get_apm_trace_error_query';
import { getTraceDocsPerPage } from './get_trace_docs_per_page';

export type TraceDoc = WaterfallTransaction | WaterfallSpan;

export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: TraceDoc[];
  errorDocs: Error[];
  spanLinksCountById: Record<string, number>;
  traceDocsTotal: number;
  maxTraceItems: number;
}

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

export async function getApmTraceError(params: {
  apmEventClient: APMEventClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  const response = await getApmTraceErrorQuery(params);

  return compactMap(response.hits.hits, (hit): Error | undefined => {
    const errorSource = 'error' in hit._source ? hit._source : undefined;
    const event = hit.fields
      ? accessKnownApmEventFields(hit.fields).requireFields(requiredFields)
      : undefined;

    if (!event) {
      return undefined;
    }

    const { _id: id, parent, error, ...unflattened } = event.unflatten();

    return {
      id,
      parent: {
        id: parent?.id ?? unflattened.span?.id,
      },
      trace: unflattened.trace,
      span: unflattened.span,
      transaction: unflattened.transaction,
      timestamp: unflattened.timestamp,
      service: { name: unflattened.service.name },
      error: {
        exception:
          (errorSource?.error.exception?.length ?? 0) > 0
            ? errorSource?.error?.exception?.[0]
            : error.exception,
        grouping_key: error?.grouping_key,
        culprit: error?.culprit,
        id: error?.id,
        log: errorSource?.error.log,
      },
      index: hit._index,
    };
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
