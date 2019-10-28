/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '../..';
import { defineGetRolesRoutes } from './get';
import { defineDeleteRolesRoutes } from './delete';
import { definePutRolesRoutes } from './put';
import { Role } from '../../../../common/model';

export type ElasticsearchRole = Pick<Role, 'name' | 'metadata' | 'transient_metadata'> & {
  applications: Array<{
    application: string;
    privileges: string[];
    resources: string[];
  }>;
  cluster: Role['elasticsearch']['cluster'];
  indices: Role['elasticsearch']['indices'];
  run_as: Role['elasticsearch']['run_as'];
};

export function defineRolesRoutes(params: RouteDefinitionParams) {
  defineGetRolesRoutes(params);
  defineDeleteRolesRoutes(params);
  definePutRolesRoutes(params);
}
