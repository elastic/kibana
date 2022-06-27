/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SearchParams {
  field: string;
  value: string;
  match?: string;
  operator?: string;
}

export const getSnapshotSearchWildcard = ({
  field,
  value,
  match,
  operator,
}: SearchParams): string => {
  // if the operator is NOT for exact match, convert to *value* wildcard that matches any substring
  value = operator === 'exact' ? value : `*${value}*`;

  // ES API new "-"("except") wildcard removes matching items from a list of already selected items
  // To find all items not containing the search value, use "*,-{searchValue}"
  // When searching for policy name, also add "_none" to find snapshots without a policy as well
  const excludingWildcard = field === 'policyName' ? `*,_none,-${value}` : `*,-${value}`;

  return match === 'must_not' ? excludingWildcard : value;
};
