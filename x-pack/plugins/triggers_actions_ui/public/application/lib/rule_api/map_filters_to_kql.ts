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
}: {
  typesFilter?: string[];
  actionTypesFilter?: string[];
  ruleStatusesFilter?: string[];
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
  if (ruleStatusesFilter && ruleStatusesFilter.length) {
    filters.push(`alert.attributes.executionStatus.status:(${ruleStatusesFilter.join(' or ')})`);
  }
  return filters;
};
