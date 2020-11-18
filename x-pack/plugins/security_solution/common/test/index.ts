/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// For the source of these roles please consult the PR these were introduced https://github.com/elastic/kibana/pull/81866#issue-511165754
export enum ROLES {
  t1_analyst = 't1_analyst',
  t2_analyst = 't2_analyst',
  hunter = 'hunter',
  rule_author = 'rule_author',
  soc_manager = 'soc_manager',
  platform_engineer = 'platform_engineer',
  detections_admin = 'detections_admin',
}

export type RolesType = keyof typeof ROLES;
