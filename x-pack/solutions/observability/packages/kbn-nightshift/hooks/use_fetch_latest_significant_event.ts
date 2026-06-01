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
import type { SignificantEventDocument } from '../types/significant_event_document';
import type { ImpactedService } from '../components/main_significant_event';
import type { ImpactedCardItem } from '../components/nightshift_app';
import type { SignificantEventDetailFields } from '../components/significant_event_detail_body';
import { normalizeRecommendations, getSeverityFromScore } from '../components/event_utils';

interface SigeventsKibanaServices {
  data: DataPublicPluginStart;
}

export const SIGEVENTS_INDEX = 'sigevents-events-ms';

export interface LatestSignificantEventData {
  raw: SignificantEventDocument;
  state: 'critical' | 'warning' | 'healthy';
  blastRadiusScore: number;
  mainEventTitle: string;
  description: string;
  impactedServices: ImpactedService[];
  impactedCards: ImpactedCardItem[];
  severityLabel: string;
  severityColor: 'danger' | 'warning' | 'primary' | 'subdued';
  detailFields: SignificantEventDetailFields;
  timestamp: string;
}

function mapDocumentToData(doc: SignificantEventDocument): LatestSignificantEventData {
  const severity = getSeverityFromScore(doc.criticality ?? 0);

  // Prefer blast_radius (confirmed items) when available; fall back to dependency_edges
  const confirmedBlastRadius = (doc.blast_radius ?? [])
    .filter((item) => item.confirmed)
    .map((item) => ({
      id: item.ki_id,
      label: item.name,
      iconType: 'layers' as const,
    }));

  const edgeDerivedServices: ImpactedService[] = (doc.dependency_edges ?? []).reduce<
    ImpactedService[]
  >((acc, edge) => {
    for (const name of [edge.source, edge.target]) {
      if (name && !acc.some((s) => s.id === name)) {
        acc.push({ id: name, label: name, iconType: 'layers' as const });
      }
    }
    return acc;
  }, []);

  const impactedServices =
    confirmedBlastRadius.length > 0 ? confirmedBlastRadius : edgeDerivedServices;

  // Build impacted cards from cause_kis (root cause) + exposed dependency edges
  const causeCards: ImpactedCardItem[] = (doc.cause_kis ?? [])
    .filter((item) => item.name)
    .map((item) => ({
      id: `cause-${item.ki_id ?? item.name}`,
      label: 'Root Cause',
      value: item.name,
      iconType: 'crosshairs' as const,
    }));

  const exposedEdgeCards: ImpactedCardItem[] = (doc.dependency_edges ?? [])
    .filter((edge) => edge.exposure === 'exposed')
    .reduce<Array<{ source: string }>>((acc, edge) => {
      if (!acc.some((e) => e.source === edge.source)) {
        acc.push(edge);
      }
      return acc;
    }, [])
    .map((edge) => ({
      id: `exposed-${edge.source}`,
      label: 'Impacted',
      value: edge.source,
      iconType: 'dot' as const,
    }));

  // If blast_radius was available, use the old card logic; otherwise use edges
  const impactedCards: ImpactedCardItem[] =
    confirmedBlastRadius.length > 0
      ? [
          ...causeCards,
          ...confirmedBlastRadius.slice(0, 2).map((service) => ({
            id: `service-${service.id}`,
            label: 'Service',
            value: service.label,
            iconType: 'layers' as const,
          })),
        ]
      : [...causeCards, ...exposedEdgeCards];

  const detailFields: SignificantEventDetailFields = {
    id: doc.event_id,
    label: doc.title,
    subtitle: (doc.stream_names ?? []).join(' · '),
    summary: doc.summary ?? '',
    rootCause: doc.root_cause ?? '',
    recommendations: normalizeRecommendations(doc.recommendations),
    recommendedAction: doc.recommended_action ?? 'monitor',
    criticality: doc.criticality ?? 0,
    ruleNames: doc.rule_names ?? [],
    streamNames: doc.stream_names ?? [],
    evidences: (doc.evidences ?? []).map((ev) => ({
      description: ev.description,
      esqlQuery: ev.esql_query,
      result: ev.result,
      rowCount: ev.row_count,
      collectedAt: ev.collected_at,
      ruleName: ev.rule_name,
      streamName: ev.stream_name,
      confirmed: ev.confirmed,
    })),
    dependencyEdges: (doc.dependency_edges ?? []).map((edge) => ({
      source: edge.source,
      target: edge.target,
      protocol: edge.protocol,
      exposure: edge.exposure,
    })),
    causeKis: (doc.cause_kis ?? []).map((ki) => ({
      name: ki.name,
      streamName: ki.stream_name,
    })),
    timestamp: doc['@timestamp'],
  };

  return {
    raw: doc,
    state: severity.state,
    blastRadiusScore: doc.criticality ?? 0,
    mainEventTitle: doc.title ?? '',
    description: doc.summary || normalizeRecommendations(doc.recommendations)[0] || '',
    impactedServices,
    impactedCards,
    severityLabel: severity.label,
    severityColor: severity.color,
    detailFields,
    timestamp: doc['@timestamp'],
  };
}

export function useFetchLatestSignificantEvent(): {
  loading: boolean;
  error: Error | null;
  data: LatestSignificantEventData | null;
  otherPromotedEvents: LatestSignificantEventData[];
  refetch: () => void;
} {
  const { services } = useKibana<SigeventsKibanaServices>();
  const { data: dataService } = services;

  const searchParams = useMemo(
    (): estypes.SearchRequest => ({
      index: SIGEVENTS_INDEX,
      query: {
        bool: {
          must: [{ term: { verdict: 'promoted' } }],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' as const } }],
      size: 100,
    }),
    []
  );

  const {
    data: result,
    error,
    isLoading,
    refetch,
  } = useQuery<estypes.SearchResponse<SignificantEventDocument>, Error>(
    ['latestSignificantEvent'],
    async ({ signal }) => {
      const response = await lastValueFrom(
        dataService.search.search<
          { params: estypes.SearchRequest },
          { rawResponse: estypes.SearchResponse<SignificantEventDocument> }
        >({ params: searchParams }, { abortSignal: signal })
      );
      return response.rawResponse;
    },
    {
      enabled: !!dataService?.search?.search,
      keepPreviousData: true,
      retry: 1,
    }
  );

  const { primaryEvent, otherEvents } = useMemo(() => {
    if (!result?.hits?.hits?.length) {
      return { primaryEvent: null, otherEvents: [] };
    }

    const docs = result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is SignificantEventDocument => doc !== undefined);

    // Primary event: highest-impact promoted event (critical > high > medium > low)
    const impactPriority: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedByImpact = [...docs].sort(
      (a, b) => (impactPriority[a.impact] ?? 4) - (impactPriority[b.impact] ?? 4)
    );
    const primaryDoc = sortedByImpact[0];
    const others = docs.filter((doc) => doc !== primaryDoc);

    return {
      primaryEvent: primaryDoc ? mapDocumentToData(primaryDoc) : null,
      otherEvents: others.map(mapDocumentToData),
    };
  }, [result]);

  return {
    loading: isLoading,
    error: error ?? null,
    data: primaryEvent,
    otherPromotedEvents: otherEvents,
    refetch,
  };
}
