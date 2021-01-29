/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { RequestHandlerContext, IRouter } from 'src/core/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';

/**
 * @internal
 */
export interface FeaturesRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type FeaturesPluginRouter = IRouter<FeaturesRequestHandlerContext>;
