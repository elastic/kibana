/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTypeMappings } from '@kbn/securitysolution-rules';

const alertTypeFilter = `(${Object.values(ruleTypeMappings)
  .map((type) => `alert.attributes.alertTypeId: ${type}`)
  .filter((type, i, arr) => type != null && arr.indexOf(type) === i)
  .join(' OR ')})`;

/**
 * updates filter to restrict search results to only Security Solution rule types (siem.eqlRule, siem.mlRule, etc..)
 * @example
 * filter BEFORE: "alert.attributes.enabled: true"
 * modified filter AFTER: "(alert.attributes.alertTypeId: siem.eqlRule OR alert.attributes.alertTypeId: siem.mlRule OR alert.attributes.alertTypeId: siem.queryRule OR alert.attributes.alertTypeId: siem.savedQueryRule OR alert.attributes.alertTypeId: siem.indicatorRule OR alert.attributes.alertTypeId: siem.thresholdRule) AND alert.attributes.enabled: true"
 * @param filter
 * @returns modified filter
 */
export const enrichFilterWithRuleTypeMapping = (filter: string | null | undefined) => {
  if (filter == null) {
    return alertTypeFilter;
  } else {
    return `${alertTypeFilter} AND ${filter}`;
  }
};
