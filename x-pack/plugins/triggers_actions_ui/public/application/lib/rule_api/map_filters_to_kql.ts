/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleStatus } from '../../../types';

const getEnablementFilter = (ruleStatusFilter: RuleStatus[] = []) => {
  const enablementFilters = ruleStatusFilter.reduce<string[]>((result, filter) => {
    if (filter === 'enabled') {
      return [...result, 'true'];
    }
    if (filter === 'disabled') {
      return [...result, 'false'];
    }
    return result;
  }, []);
  return `alert.attributes.enabled:(${enablementFilters.join(' or ')})`;
};

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
    const enablementFilter = getEnablementFilter(ruleStatusesFilter);
    const snoozedFilter = `(alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now)`;
    const hasEnablement =
      ruleStatusesFilter.includes('enabled') || ruleStatusesFilter.includes('disabled');
    const hasSnoozed = ruleStatusesFilter.includes('snoozed');

    if (hasEnablement && !hasSnoozed) {
      filters.push(`${enablementFilter} and not ${snoozedFilter}`);
    } else if (!hasEnablement && hasSnoozed) {
      filters.push(snoozedFilter);
    } else {
      filters.push(`${enablementFilter} or ${snoozedFilter}`);
    }
  }
  if (tagsFilter && tagsFilter.length) {
    filters.push(`alert.attributes.tags:(${tagsFilter.join(' or ')})`);
  }

  return filters;
};
