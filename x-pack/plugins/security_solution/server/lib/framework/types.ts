/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, RequestHandlerContext } from '../../../../../../src/core/server';
import { AuthenticatedUser } from '../../../../security/common/model';

export const internalFrameworkRequest = Symbol('internalFrameworkRequest');

export interface FrameworkRequest extends Pick<KibanaRequest, 'body'> {
  [internalFrameworkRequest]: KibanaRequest;
  context: RequestHandlerContext;
  user: AuthenticatedUser | null;
}
