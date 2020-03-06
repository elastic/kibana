/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';

import {
  IRouter,
  RequestHandlerContext,
  KibanaResponseFactory,
  KibanaRequest,
  IKibanaResponse,
} from 'src/core/server';
import { CaseServiceSetup } from '../../services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ConfigType } from '../../../../actions/server/builtin_action_types/servicenow/types';
import {
  NewActionSchema,
  FindActionsSchema,
  CheckActionHealthSchema,
  IdSchema,
  CasesConfigurationSchema,
} from './schema';

export interface RouteDeps {
  caseService: CaseServiceSetup;
  router: IRouter;
}

export enum SortFieldCase {
  createdAt = 'created_at',
  state = 'state',
  updatedAt = 'updated_at',
}

export type CaseRequestHandler = (
  service: CaseServiceSetup,
  context: RequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory
) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;

export interface UpdateCaseConfiguration {
  name: string;
  actionTypeId: string;
  config: ConfigType;
}

export type NewActionType = TypeOf<typeof NewActionSchema>;
export type FindActionsType = TypeOf<typeof FindActionsSchema>;
export type CheckActionHealthType = TypeOf<typeof CheckActionHealthSchema>;
export type IdType = TypeOf<typeof IdSchema>;
export type CasesConfigurationType = TypeOf<typeof CasesConfigurationSchema>;
