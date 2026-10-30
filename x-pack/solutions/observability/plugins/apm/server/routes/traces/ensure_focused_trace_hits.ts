/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_MARKS_AGENT,
} from '../../../common/es_fields/apm';
import { ecsOnlyOptionalFields, fields, optionalFields } from './trace_constants';

const MAX_ANCESTOR_HOPS = 50;

export type FocusedTraceHit = Pick<SearchHit, 'fields'>;

export function getTraceHitId(hit: FocusedTraceHit): string | undefined {
  return firstStringField(hit.fields, SPAN_ID) ?? firstStringField(hit.fields, TRANSACTION_ID);
}

export function getTraceHitParentId(hit: FocusedTraceHit): string | undefined {
  return firstStringField(hit.fields, PARENT_ID);
}

function firstStringField(hitFields: SearchHit['fields'], fieldName: string): string | undefined {
  if (!hitFields) {
    return undefined;
  }

  const value = Reflect.get(hitFields, fieldName);
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }

  return undefined;
}

/**
 * Ranked waterfall pagination can drop the focused transaction when a large
 * multi-root trace spends `maxTraceItems` on long sibling roots. Fetch the
 * focused document and its ancestors, then merge them into the ranked hits
 * while staying at `maxTraceItems`.
 */
export async function ensureFocusedTraceHits<THit extends FocusedTraceHit>({
  apmEventClient,
  hits,
  focusedDocId,
  maxTraceItems,
  traceId,
  start,
  end,
  ecsOnly,
  serviceName,
}: {
  apmEventClient: APMEventClient;
  hits: THit[];
  focusedDocId: string;
  maxTraceItems: number;
  traceId: string;
  start: number;
  end: number;
  ecsOnly: boolean;
  serviceName?: string;
}): Promise<THit[]> {
  const hitsById = new Map<string, THit>();
  for (const hit of hits) {
    const id = getTraceHitId(hit);
    if (id) {
      hitsById.set(id, hit);
    }
  }

  const reserved: THit[] = [];
  const walkedIds = new Set<string>();
  let idsToFetch = hitsById.has(focusedDocId) ? [] : [focusedDocId];
  let currentId = focusedDocId;

  for (let hop = 0; hop < MAX_ANCESTOR_HOPS; hop++) {
    if (walkedIds.has(currentId)) {
      break;
    }
    walkedIds.add(currentId);
    if (idsToFetch.length > 0) {
      const fetchedHits = await fetchTraceHitsByIds({
        apmEventClient,
        traceId,
        start,
        end,
        ids: idsToFetch,
        ecsOnly,
        serviceName,
      });

      for (const fetchedHit of fetchedHits) {
        const id = getTraceHitId(fetchedHit);
        if (!id || !idsToFetch.includes(id) || hitsById.has(id)) {
          continue;
        }
        // Intentional `as THit` type assertion as apmEventClient.search returns generic Elasticsearch SearchHit documents;
        const typedHit = fetchedHit as THit;
        hitsById.set(id, typedHit);
        reserved.push(typedHit);
      }
    }

    const currentHit = hitsById.get(currentId);
    const parentId = currentHit ? getTraceHitParentId(currentHit) : undefined;
    if (!parentId) {
      break;
    }

    // A parent already on the ranked page still needs its own parent fetched.
    currentId = parentId;
    idsToFetch = hitsById.has(parentId) ? [] : [parentId];
  }

  if (reserved.length === 0) {
    return hits;
  }

  // Pin the focused document and every ancestor already resolved, including
  // hits that were on the ranked page. Newly fetched ancestors take slots from
  // the tail, and the selected document is often that tail.
  const chain: THit[] = [];
  const seenChainIds = new Set<string>();
  let chainId: string | undefined = focusedDocId;

  for (let hop = 0; hop < MAX_ANCESTOR_HOPS && chainId && !seenChainIds.has(chainId); hop++) {
    seenChainIds.add(chainId);
    const chainHit = hitsById.get(chainId);
    if (!chainHit) {
      break;
    }
    chain.push(chainHit);
    chainId = getTraceHitParentId(chainHit);
  }

  const rankedRemainder = hits.filter((hit) => {
    const id = getTraceHitId(hit);
    return id !== undefined && !seenChainIds.has(id);
  });
  const keptChain = chain.slice(0, maxTraceItems);
  const remainingSlots = Math.max(0, maxTraceItems - keptChain.length);

  return [...keptChain, ...rankedRemainder.slice(0, remainingSlots)];
}

async function fetchTraceHitsByIds({
  apmEventClient,
  traceId,
  start,
  end,
  ids,
  ecsOnly,
  serviceName,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  start: number;
  end: number;
  ids: string[];
  ecsOnly: boolean;
  serviceName?: string;
}): Promise<FocusedTraceHit[]> {
  if (ids.length === 0) {
    return [];
  }

  const response = await apmEventClient.search(
    'get_focused_trace_items',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      track_total_hits: false,
      size: ids.length,
      query: {
        bool: {
          filter: [
            ...termQuery(TRACE_ID, traceId),
            ...rangeQuery(start, end),
            // The service flyout passes serviceName, and its ranked page is already
            // limited to that service. Ancestors from other services stay out so they
            // cannot take maxTraceItems slots. Callers that omit serviceName, such as
            // transaction details, still reserve the full cross-service chain.
            ...termQuery(SERVICE_NAME, serviceName),
          ],
          // Child spans copy transaction.id from their transaction. Restrict that
          // clause to transaction documents so a span cannot take the only hit.
          should: [
            {
              bool: {
                filter: [
                  { terms: { [TRANSACTION_ID]: ids } },
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
                ],
              },
            },
            { terms: { [SPAN_ID]: ids } },
          ],
          minimum_should_match: 1,
        },
      },
      fields: [...fields, ...(ecsOnly ? ecsOnlyOptionalFields : optionalFields)],
      _source: [TRANSACTION_MARKS_AGENT],
    },
    { skipProcessorEventFilter: !ecsOnly }
  );

  return response.hits.hits;
}
