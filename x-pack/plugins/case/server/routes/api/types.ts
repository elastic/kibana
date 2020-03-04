/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { CaseServiceSetup } from '../../services';

export interface RouteDeps {
  caseService: CaseServiceSetup;
  router: IRouter;
}

export enum SortFieldCase {
  createdAt = 'created_at',
  state = 'state',
  updatedAt = 'updated_at',
}

export type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

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
