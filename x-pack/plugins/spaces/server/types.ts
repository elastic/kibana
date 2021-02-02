/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';

/**
 * @internal
 */
export interface SpacesRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type SpacesRouter = IRouter<SpacesRequestHandlerContext>;
