/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';
import type { EventDocument } from '../hooks/use_fetch_system_overview';
import type { SignificantEventDetailFields } from './significant_event_detail_body';

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

function getSeverityLevel(score: number): SeverityLevel {
  if (score >= 75) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export type SeverityBand = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SeverityInfo {
  label: SeverityBand;
  color: 'danger' | 'warning' | 'primary' | 'subdued';
  badgeColor: EuiBadgeProps['color'];
  state: 'critical' | 'warning' | 'healthy';
}

const SEVERITY_INFO: Record<SeverityLevel, SeverityInfo> = {
  critical: { label: 'Critical', color: 'danger', badgeColor: 'danger', state: 'critical' },
  high: { label: 'High', color: 'warning', badgeColor: 'warning', state: 'warning' },
  medium: { label: 'Medium', color: 'primary', badgeColor: 'primary', state: 'warning' },
  low: { label: 'Low', color: 'subdued', badgeColor: 'default', state: 'healthy' },
};

/**
 * Derives the severity band, badge color, and overall state from a 0-100 score.
 * Bands: Critical (75-100), High (60-74), Medium (40-59), Low (0-39).
 */
export const getSeverityFromScore = (score: number): SeverityInfo =>
  SEVERITY_INFO[getSeverityLevel(score)];

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

/**
 * @deprecated Use getSeverityFromScore instead. Kept for backward compat during migration.
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
): SignificantEventDetailFields => {
  return {
    id: event.event_id,
    label: event.title,
    subtitle: '',
    summary: event.summary,
    rootCause: event.root_cause,
    recommendations: normalizeRecommendations(event.recommendations),
    recommendedAction: event.recommended_action,
    criticality: event.criticality,
    ruleNames: event.rule_names ?? [],
    streamNames: event.stream_names ?? [],
    evidences: [],
    dependencyEdges: [],
    causeKis: [],
    timestamp: event['@timestamp'],
  };
};
