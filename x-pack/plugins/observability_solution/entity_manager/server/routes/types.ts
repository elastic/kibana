/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import { Logger } from '@kbn/core/server';
import { EntityManagerServerSetup } from '../types';

export interface SetupRouteOptions<T extends RequestHandlerContextBase> {
  router: IRouter<T>;
  server: EntityManagerServerSetup;
  logger: Logger;
}
