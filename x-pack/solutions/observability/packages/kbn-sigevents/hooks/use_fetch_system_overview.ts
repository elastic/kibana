/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { estypes } from '@elastic/elasticsearch';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DEMO_DENIED_EVENT_TITLES } from './use_fetch_latest_significant_event';

interface SigeventsKibanaServices {
  data: DataPublicPluginStart;
  http: {
    fetch: <T = unknown>(path: string, options?: { signal?: AbortSignal }) => Promise<T>;
  };
}

const EVENTS_INDEX = 'sigevents-events-ms';

interface KiFeatureDocument {
  type: string;
  subtype?: string;
  properties: Record<string, unknown>;
}

export interface EventDocument {
  '@timestamp': string;
  event_id: string;
  verdict_id: string;
  discovery_id: string;
  discovery_slug: string;
  verdict: 'promoted' | 'acknowledged' | 'demoted';
  title: string;
  summary: string;
  root_cause: string;
  rule_names: string[];
  stream_names: string[];
  criticality: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  recommendations?: string[];
  recommended_action: 'escalate' | 'monitor' | 'resolve';
  last_reviewed_at: string;
}

export type SigEventPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PriorityCounts {
  open: number;
  resolved: number;
}

export interface SystemOverviewData {
  serviceCount: number;
  entityCount: number;
  technologyCount: number;
  sigEventsByPriority: Record<SigEventPriority, PriorityCounts>;
  acknowledgedEvents: EventDocument[];
}

interface ImpactAggBucket {
  key: string;
  doc_count: number;
  by_verdict: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}

interface ImpactAggResponse {
  aggregations?: {
    by_impact: {
      buckets: ImpactAggBucket[];
    };
  };
}

export function useFetchSystemOverview(): {
  loading: boolean;
  error: Error | null;
  data: SystemOverviewData | null;
  refetch: () => void;
} {
  const { services } = useKibana<SigeventsKibanaServices>();
  const { data: dataService, http } = services;

  const {
    data: result,
    error,
    isLoading,
    refetch,
  } = useQuery<SystemOverviewData, Error>(
    ['systemOverview'],
    async ({ signal }) => {
      const eventsParams: estypes.SearchRequest = {
        index: EVENTS_INDEX,
        size: 5,
        query: {
          bool: {
            must_not: [
              { term: { verdict: 'demoted' } },
              ...DEMO_DENIED_EVENT_TITLES.map((t) => ({ match_phrase: { title: t } })),
            ],
          },
        },
        sort: [{ criticality: { order: 'desc' } }, { '@timestamp': { order: 'desc' } }],
      };

      const priorityParams: estypes.SearchRequest = {
        index: EVENTS_INDEX,
        size: 0,
        query: {
          bool: {
            must_not: DEMO_DENIED_EVENT_TITLES.map((t) => ({ match_phrase: { title: t } })),
          },
        },
        aggs: {
          by_impact: {
            terms: { field: 'impact', size: 10 },
            aggs: {
              by_verdict: {
                terms: { field: 'verdict', size: 10 },
              },
            },
          },
        },
      };

      // Fetch KI features for entity and technology counts.
      // Gracefully degrade when Streams is disabled or the user lacks access.
      const featuresPromise = http?.fetch
        ? http
            .fetch<{ features: KiFeatureDocument[] }>('/internal/streams/_features', { signal })
            .catch(() => ({ features: [] as KiFeatureDocument[] }))
        : Promise.resolve({ features: [] as KiFeatureDocument[] });

      const [eventsResp, priorityResp, featuresResp] = await Promise.all([
        lastValueFrom(
          dataService.search.search<
            { params: estypes.SearchRequest },
            { rawResponse: estypes.SearchResponse<EventDocument> }
          >({ params: eventsParams }, { abortSignal: signal })
        ),
        lastValueFrom(
          dataService.search.search<
            { params: estypes.SearchRequest },
            { rawResponse: estypes.SearchResponse<unknown> & ImpactAggResponse }
          >({ params: priorityParams }, { abortSignal: signal })
        ),
        featuresPromise,
      ]);

      const acknowledgedEvents = (eventsResp.rawResponse.hits.hits ?? [])
        .map((hit) => hit._source)
        .filter((doc): doc is EventDocument => doc !== undefined);

      const sigEventsByPriority: Record<SigEventPriority, PriorityCounts> = {
        critical: { open: 0, resolved: 0 },
        high: { open: 0, resolved: 0 },
        medium: { open: 0, resolved: 0 },
        low: { open: 0, resolved: 0 },
      };

      const impactBuckets = priorityResp.rawResponse.aggregations?.by_impact?.buckets ?? [];
      for (const bucket of impactBuckets) {
        const priority = bucket.key as SigEventPriority;
        if (!(priority in sigEventsByPriority)) {
          continue;
        }
        for (const verdictBucket of bucket.by_verdict.buckets) {
          if (verdictBucket.key === 'demoted') {
            sigEventsByPriority[priority].resolved += verdictBucket.doc_count;
          } else {
            sigEventsByPriority[priority].open += verdictBucket.doc_count;
          }
        }
      }

      const entities = featuresResp.features.filter((f) => f.type === 'entity');
      const serviceCount = entities.filter((f) => f.subtype === 'service').length;
      const entityCount = entities.length;
      const technologyCount = featuresResp.features.filter((f) => f.type === 'technology').length;

      return {
        serviceCount,
        entityCount,
        technologyCount,
        sigEventsByPriority,
        acknowledgedEvents,
      };
    },
    {
      enabled: !!dataService?.search?.search,
      keepPreviousData: true,
      retry: 1,
    }
  );

  const overviewData = useMemo(() => result ?? null, [result]);

  return {
    loading: isLoading,
    error: error ?? null,
    data: overviewData,
    refetch,
  };
}
