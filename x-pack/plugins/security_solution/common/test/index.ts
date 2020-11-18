/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// https://basarat.gitbook.io/typescript/type-system/literal-types
/** Utility function to create a K:V from a list of strings */
const strEnum = <T extends string>(o: T[]): { [K in T]: K } => {
  return o.reduce((res, key) => {
    res[key] = key;
    return res;
  }, Object.create(null));
};

// For the source of these roles please consult the PR these were introduced https://github.com/elastic/kibana/pull/81866#issue-511165754
export const ROLES = strEnum([
  't1_analyst',
  't2_analyst',
  'hunter',
  'rule_author',
  'soc_manager',
  'platform_engineer',
  'detections_admin',
]);

export type ROLES = keyof typeof ROLES;
