/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { ActionsApiRequestHandlerContext } from '../../actions/server';
import { CasesClient } from './client';

export interface CaseRequestContext {
  getCasesClient: () => CasesClient;
}

/**
 * @internal
 */
export interface CasesRequestHandlerContext extends RequestHandlerContext {
  cases: CaseRequestContext;
  actions: ActionsApiRequestHandlerContext;
}

/**
 * @internal
 */
export type CasesRouter = IRouter<CasesRequestHandlerContext>;
