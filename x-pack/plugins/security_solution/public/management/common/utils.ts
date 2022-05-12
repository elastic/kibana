/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

export const parseQueryFilterToKQL = (
  filter: string | undefined,
  fields: Readonly<string[]>
): string => {
  if (!filter) return '';
  const kuery = fields
    .map(
      (field) =>
        `exception-list-agnostic.attributes.${field}:(*${filter
          .trim()
          .replace(/([\)\(\<\>\}\{\"\:\\])/gm, '\\$&') // Escape problematic chars
          .replace(/\s/gm, '*')}*)`
    )
    .join(' OR ');

  return `(${kuery})`;
};

const getPolicyQuery = (policyId: string): string => {
  if (policyId === 'global') return 'exception-list-agnostic.attributes.tags:"policy:all"';
  if (policyId === 'unassigned') return '(not exception-list-agnostic.attributes.tags:*)';
  return `exception-list-agnostic.attributes.tags:"policy:${policyId}"`;
};

export const parsePoliciesToKQL = (
  includedPolicies: string[],
  excludedPolicies: string[] = []
): string => {
  if (isEmpty(includedPolicies) && isEmpty(excludedPolicies)) return '';

  const includedPoliciesKuery = includedPolicies.map(getPolicyQuery).join(' OR ');

  const excludedPoliciesKuery = excludedPolicies
    .map((policyId) => `not ${getPolicyQuery(policyId)}`)
    .join(' AND ');

  const kuery = [];

  if (includedPoliciesKuery) kuery.push(includedPoliciesKuery);
  if (excludedPoliciesKuery) kuery.push(excludedPoliciesKuery);

  return `(${kuery.join(' AND ')})`;
};

/**
 * Takes a list of policies (string[]) and an existing kuery
 * (string) and returns an unified KQL with and AND
 * The policy list can also contain "unassigned" and "global".
 * @param policies string[] a list of policies ids.
 * @param excludedPolicies string[] a list of policies ids to exclude.
 * @param kuery string an existing KQL.
 */
export const parsePoliciesAndFilterToKql = ({
  policies = [],
  excludedPolicies = [],
  kuery,
}: {
  policies?: string[];
  excludedPolicies?: string[];
  kuery?: string;
}): string | undefined => {
  if (policies?.length === 0 && excludedPolicies?.length === 0) {
    return kuery ? kuery : undefined;
  }

  const policiesKQL = parsePoliciesToKQL(policies, excludedPolicies);
  return `(${policiesKQL})${kuery ? ` AND (${kuery})` : ''}`;
};
