/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsolationRouteRequestBody } from '../../../../../common/api/endpoint';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { BaseActionsProvider } from '../../../lib/response_actions/base_actions_provider';

/** Supports sending response actions to SentinelOne agent */
export class SentinelOneActionProvider extends BaseActionsProvider {
  async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    // FIXME:PT implement
  }

  async release(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    // FIXME: implement
  }
}
