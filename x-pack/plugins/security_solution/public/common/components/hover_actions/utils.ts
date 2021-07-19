/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserField } from '../../containers/source';

export const getAdditionalScreenReaderOnlyContext = ({
  field,
  value,
}: {
  field: string;
  value?: string[] | string | null;
}): string => {
  if (value == null) {
    return field;
  }

  return Array.isArray(value) ? `${field} ${value.join(' ')}` : `${field} ${value}`;
};

export const allowTopN = ({
  browserField,
  fieldName,
}: {
  browserField: Partial<BrowserField> | undefined;
  fieldName: string;
}): boolean => {
  const isAggregatable = browserField?.aggregatable ?? false;
  const fieldType = browserField?.type ?? '';
  const isAllowedType = [
    'boolean',
    'geo-point',
    'geo-shape',
    'ip',
    'keyword',
    'number',
    'numeric',
    'string',
  ].includes(fieldType);

  // TODO: remove this explicit allowlist when the ECS documentation includes alerts
  const isAllowlistedNonBrowserField = [
    'signal.ancestors.depth',
    'signal.ancestors.id',
    'signal.ancestors.rule',
    'signal.ancestors.type',
    'signal.original_event.action',
    'signal.original_event.category',
    'signal.original_event.code',
    'signal.original_event.created',
    'signal.original_event.dataset',
    'signal.original_event.duration',
    'signal.original_event.end',
    'signal.original_event.hash',
    'signal.original_event.id',
    'signal.original_event.kind',
    'signal.original_event.module',
    'signal.original_event.original',
    'signal.original_event.outcome',
    'signal.original_event.provider',
    'signal.original_event.risk_score',
    'signal.original_event.risk_score_norm',
    'signal.original_event.sequence',
    'signal.original_event.severity',
    'signal.original_event.start',
    'signal.original_event.timezone',
    'signal.original_event.type',
    'signal.original_time',
    'signal.parent.depth',
    'signal.parent.id',
    'signal.parent.index',
    'signal.parent.rule',
    'signal.parent.type',
    'signal.rule.created_by',
    'signal.rule.description',
    'signal.rule.enabled',
    'signal.rule.false_positives',
    'signal.rule.filters',
    'signal.rule.from',
    'signal.rule.id',
    'signal.rule.immutable',
    'signal.rule.index',
    'signal.rule.interval',
    'signal.rule.language',
    'signal.rule.max_signals',
    'signal.rule.name',
    'signal.rule.note',
    'signal.rule.output_index',
    'signal.rule.query',
    'signal.rule.references',
    'signal.rule.risk_score',
    'signal.rule.rule_id',
    'signal.rule.saved_id',
    'signal.rule.severity',
    'signal.rule.size',
    'signal.rule.tags',
    'signal.rule.threat',
    'signal.rule.threat.tactic.id',
    'signal.rule.threat.tactic.name',
    'signal.rule.threat.tactic.reference',
    'signal.rule.threat.technique.id',
    'signal.rule.threat.technique.name',
    'signal.rule.threat.technique.reference',
    'signal.rule.timeline_id',
    'signal.rule.timeline_title',
    'signal.rule.to',
    'signal.rule.type',
    'signal.rule.updated_by',
    'signal.rule.version',
    'signal.status',
  ].includes(fieldName);

  return isAllowlistedNonBrowserField || (isAggregatable && isAllowedType);
};
