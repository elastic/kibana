/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from '../../../common/types/app_search';
export { IRole, TRole, TAbility } from './utils/role';

export interface IApiToken {
  access_all_engines?: boolean;
  key?: string;
  engines?: string[];
  id?: number;
  name: string;
  read?: boolean;
  type: string;
  write?: boolean;
}

export interface IEngine {
  name: string;
  type: string;
  language: string;
  result_fields: object[];
}
