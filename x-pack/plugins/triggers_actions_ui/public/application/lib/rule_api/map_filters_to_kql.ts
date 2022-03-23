/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mapFiltersToKql = ({
  typesFilter,
  actionTypesFilter,
  ruleStatusesFilter,
  ruleStatusFilter,
}: {
  typesFilter?: string[];
  actionTypesFilter?: string[];
  ruleStatusesFilter?: string[];
  ruleStatusFilter?: boolean[];
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
  // TODO rename ruleStatusesFilter to ruleLastResponseFilter in both triggers_actions_ui and observability plugins
  if (ruleStatusesFilter && ruleStatusesFilter.length) {
    filters.push(`alert.attributes.executionStatus.status:(${ruleStatusesFilter.join(' or ')})`);
  }
  if (ruleStatusFilter && ruleStatusFilter.length) {
    filters.push(`alert.attributes.enabled:(${ruleStatusFilter.join(' or ')})`);
  }
  return filters;
};
