/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiHealthProps } from '@elastic/eui';
import type { EventDocument } from '../hooks/use_fetch_system_overview';
import type { SignificantEventDetailFields } from './significant_event_detail_body';

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const getRecommendedActionBadgeColor = (
  action: EventDocument['recommended_action'] | string | undefined
): 'warning' | 'success' | 'neutral' => {
  switch (action) {
    case 'escalate':
      return 'warning';
    case 'resolve':
      return 'success';
    case 'investigate':
    case 'monitor':
    default:
      return 'neutral';
  }
};

export const getRecommendedActionIcon = (
  action: EventDocument['recommended_action'] | string | undefined
): string => {
  switch (action) {
    case 'escalate':
      return 'warning';
    case 'monitor':
      return 'eye';
    case 'resolve':
      return 'checkInCircleFilled';
    case 'investigate':
      return 'search';
    default:
      return 'questionInCircle';
  }
};

export const getImpactBadgeColor = (
  impact: EventDocument['impact'] | string
): 'warning' | 'primary' | 'default' | 'danger' => {
  switch (impact) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
    default:
      return 'default';
  }
};

/**
 * Maps a severity color token to a badge color.
 * Useful when the data already provides a color key (e.g. LatestSignificantEventData).
 */
export const getSeverityBadgeColor = (
  color: 'danger' | 'warning' | 'primary' | 'subdued' | string
): 'warning' | 'primary' | 'default' | 'danger' => {
  switch (color) {
    case 'danger':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'primary':
      return 'primary';
    case 'subdued':
    default:
      return 'default';
  }
};

export const getCriticalityHealthColor = (
  impact: EventDocument['impact']
): EuiHealthProps['color'] => {
  switch (impact) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
    default:
      return 'subdued';
  }
};

/**
 * Coerces a recommendations value (which may arrive from ES as a string
 * instead of an array) into a guaranteed `string[]`.
 */
export const normalizeRecommendations = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.length > 0) {
    const cleaned = value.startsWith('$') ? value.slice(1) : value;
    return cleaned.length > 0 ? [cleaned] : [];
  }
  return [];
};

/**
 * Adapts an `EventDocument` (from the lower-priority / acknowledged events
 * index) into the `SignificantEventDetailFields` shape used by the shared
 * `SignificantEventDetailBody` component.
 */
export const adaptEventDocumentToDetailFields = (
  event: EventDocument
): SignificantEventDetailFields => ({
  id: event.event_id,
  label: event.title,
  subtitle: '',
  severityLabel: capitalize(event.impact),
  severityColor: getImpactBadgeColor(event.impact),
  summary: event.summary,
  rootCause: event.root_cause,
  recommendations: normalizeRecommendations(event.recommendations),
  recommendedAction: event.recommended_action,
  criticality: event.criticality,
  impact: capitalize(event.impact),
  ruleNames: event.rule_names ?? [],
  streamNames: event.stream_names ?? [],
  evidences: [],
  dependencyEdges: [],
  causeKis: [],
  timestamp: event['@timestamp'],
});
