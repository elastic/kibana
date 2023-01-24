/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ElasticsearchPrivilegesType, KibanaPrivilegesType } from './role_schema';
export { elasticsearchRoleSchema, getKibanaRoleSchema } from './role_schema';
export {
  validateKibanaPrivileges,
  transformPrivilegesToElasticsearchPrivileges,
} from './role_utils';
