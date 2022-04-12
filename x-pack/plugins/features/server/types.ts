/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, IRouter } from 'src/core/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';

/**
 * @internal
 */
export type FeaturesRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
}>;

/**
 * @internal
 */
export type FeaturesPluginRouter = IRouter<FeaturesRequestHandlerContext>;
