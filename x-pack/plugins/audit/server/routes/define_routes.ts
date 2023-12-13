/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { findAuditRoute } from './find';
import { AuditRequestHandlerContext } from '../types';

export function defineRoutes(router: IRouter<AuditRequestHandlerContext>) {
  findAuditRoute(router);
}
