/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from '../../../common/types/app_search';
export { Role, RoleTypes, AbilityTypes } from './utils/role';

export interface Engine {
  name: string;
  type: string;
  language: string;
  result_fields: object[];
}
