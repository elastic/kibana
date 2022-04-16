/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import {
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  ActionType,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '@kbn/actions-plugin/server/types';
import { CasesClient } from './client';

export interface CaseRequestContext {
  getCasesClient: () => Promise<CasesClient>;
}

/**
 * @internal
 */
export interface CasesRequestHandlerContext extends RequestHandlerContext {
  cases: CaseRequestContext;
}

/**
 * @internal
 */
export type CasesRouter = IRouter<CasesRequestHandlerContext>;

export type RegisterActionType = <
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
) => void;
