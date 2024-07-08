/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionRequestOptions, ActionRequestStrategyResponse } from './action';

export * from './action';
export * from './types';
export * from './response';

export enum ResponseActionsQueries {
  actions = 'responseActions',
}

export type EndpointFactoryQueryTypes = ResponseActionsQueries;

export type EndpointStrategyResponseType<T extends EndpointFactoryQueryTypes> =
  T extends ResponseActionsQueries.actions ? ActionRequestStrategyResponse : never;

export type EndpointStrategyRequestType<T extends EndpointFactoryQueryTypes> =
  T extends ResponseActionsQueries.actions ? ActionRequestOptions : never;
