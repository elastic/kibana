/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { DEMO_DENIED_TITLE_PATTERNS } from './use_fetch_latest_significant_event';

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

/**
 * Builds an ES|QL WHERE clause fragment that excludes denied title patterns.
 * Uses case-insensitive NOT LIKE for substring matching.
 */
function buildDenyFilter(): string {
  return DEMO_DENIED_TITLE_PATTERNS.map((p) => `NOT title LIKE "*${p}*"`).join(' AND ');
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
      const denyFilter = buildDenyFilter();

      const eventsQuery = `FROM ${EVENTS_INDEX}
| WHERE verdict != "demoted" AND ${denyFilter}
| SORT criticality DESC, \`@timestamp\` DESC
| LIMIT 5
| KEEP \`@timestamp\`, event_id, verdict_id, discovery_id, discovery_slug, verdict, title, summary, root_cause, rule_names, stream_names, criticality, impact, recommendations, recommended_action, last_reviewed_at`;

      // Derive the severity band from the criticality score so counts match the
      // table's getSeverityFromScore logic (Critical 75+, High 60-74, Medium 40-59, Low 0-39).
      const countsQuery = `FROM ${EVENTS_INDEX}
| WHERE ${denyFilter}
| EVAL severity_band = CASE(criticality >= 75, "critical", criticality >= 60, "high", criticality >= 40, "medium", "low")
| STATS count = COUNT(*) BY severity_band, verdict`;

      // Fetch KI features for entity and technology counts.
      // Gracefully degrade when Streams is disabled or the user lacks access.
      const featuresPromise = http?.fetch
        ? http
            .fetch<{ features: KiFeatureDocument[] }>('/internal/streams/_features', { signal })
            .catch(() => ({ features: [] as KiFeatureDocument[] }))
        : Promise.resolve({ features: [] as KiFeatureDocument[] });

      const [eventsResp, countsResp, featuresResp] = await Promise.all([
        lastValueFrom(
          dataService.search.search<
            { params: ESQLSearchParams },
            { rawResponse: ESQLSearchResponse }
          >({ params: { query: eventsQuery } }, { strategy: 'esql', abortSignal: signal })
        ),
        lastValueFrom(
          dataService.search.search<
            { params: ESQLSearchParams },
            { rawResponse: ESQLSearchResponse }
          >({ params: { query: countsQuery } }, { strategy: 'esql', abortSignal: signal })
        ),
        featuresPromise,
      ]);

      // Parse events: columnar → row objects
      const eventsRaw = eventsResp.rawResponse;
      const eventColumns = eventsRaw.columns.map((c) => c.name);
      const acknowledgedEvents: EventDocument[] = (eventsRaw.values ?? []).map((row) => {
        const obj: Record<string, unknown> = {};
        eventColumns.forEach((col, i) => {
          obj[col] = (row as unknown[])[i];
        });
        return obj as unknown as EventDocument;
      });

      // Parse counts: impact × verdict → priority buckets
      const sigEventsByPriority: Record<SigEventPriority, PriorityCounts> = {
        critical: { open: 0, resolved: 0 },
        high: { open: 0, resolved: 0 },
        medium: { open: 0, resolved: 0 },
        low: { open: 0, resolved: 0 },
      };

      const countsRaw = countsResp.rawResponse;
      const countColumns = countsRaw.columns.map((c) => c.name);
      const countIdx = countColumns.indexOf('count');
      const bandIdx = countColumns.indexOf('severity_band');
      const verdictIdx = countColumns.indexOf('verdict');

      for (const row of countsRaw.values ?? []) {
        const typedRow = row as unknown[];
        const count = typedRow[countIdx] as number;
        const band = typedRow[bandIdx] as string;
        const verdict = typedRow[verdictIdx] as string;

        if (band in sigEventsByPriority) {
          const priority = band as SigEventPriority;
          if (verdict === 'demoted') {
            sigEventsByPriority[priority].resolved += count;
          } else {
            sigEventsByPriority[priority].open += count;
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
