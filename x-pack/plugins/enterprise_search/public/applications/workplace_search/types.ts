/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IAccount {
  id: string;
  isCurated?: boolean;
  isAdmin: boolean;
  canCreatePersonalSources: boolean;
  groups: string[];
  supportEligible: boolean;
}

export type TSpacerSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
