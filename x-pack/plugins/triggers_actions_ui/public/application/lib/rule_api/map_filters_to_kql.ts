/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleStatus } from '../../../types';

export const mapFiltersToKql = ({
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
}: {
  typesFilter?: string[];
  actionTypesFilter?: string[];
  tagsFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleStatusesFilter?: RuleStatus[];
}): string[] => {
  const filters = [];

  if (typesFilter && typesFilter.length) {
    filters.push(`alert.attributes.alertTypeId:(${typesFilter.join(' or ')})`);
  }
  if (actionTypesFilter && actionTypesFilter.length) {
    filters.push(
      [
        '(',
        actionTypesFilter
          .map((id) => `alert.attributes.actions:{ actionTypeId:${id} }`)
          .join(' OR '),
        ')',
      ].join('')
    );
  }
  if (ruleExecutionStatusesFilter && ruleExecutionStatusesFilter.length) {
    filters.push(
      `alert.attributes.executionStatus.status:(${ruleExecutionStatusesFilter.join(' or ')})`
    );
  }

  if (ruleStatusesFilter && ruleStatusesFilter.length) {
    const snoozedFilter = `(alert.attributes.muteAll:true OR alert.attributes.snoozeSchedule: { duration > 0 })`;
    const enabledFilter = `alert.attributes.enabled: true`;
    const disabledFilter = `alert.attributes.enabled: false`;

    const result = [];

    if (ruleStatusesFilter.includes('enabled')) {
      result.push(enabledFilter);
    }

    if (ruleStatusesFilter.includes('disabled')) {
      result.push(disabledFilter);
    }

    if (ruleStatusesFilter.includes('snoozed')) {
      result.push(`${snoozedFilter}`);
    }

    filters.push(result.join(' and '));
  }

  if (tagsFilter && tagsFilter.length) {
    filters.push(`alert.attributes.tags:(${tagsFilter.join(' or ')})`);
  }

  return filters;
};
