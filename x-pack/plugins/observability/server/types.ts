/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { AlertingApiRequestHandlerContext } from '../../alerting/server';
import type { ScopedRuleRegistryClient, FieldMapOf } from '../../rule_registry/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';
import type { ObservabilityRuleRegistry } from './plugin';

export type {
  ObservabilityRouteCreateOptions,
  ObservabilityRouteHandlerResources,
  AbstractObservabilityServerRouteRepository,
  ObservabilityServerRouteRepository,
  ObservabilityAPIReturnType,
} from './routes/types';

/**
 * @internal
 */
export interface ObservabilityRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type ObservabilityPluginRouter = IRouter<ObservabilityRequestHandlerContext>;

export type ObservabilityRuleRegistryClient = ScopedRuleRegistryClient<
  FieldMapOf<ObservabilityRuleRegistry>
>;
