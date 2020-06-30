/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointConfigType } from '../../../config';
import { RequestHandlerContext } from '../../../../../../../../src/core/server';

/**
 * Abstract Pagination class for determining next/prev urls,
 * among other things.
 */
export abstract class Pagination<T, Z> {
  constructor(
    protected config: EndpointConfigType,
    protected requestContext: RequestHandlerContext,
    protected state: T,
    protected data: Z
  ) {}
  abstract async getNextUrl(): Promise<string | null>;
  abstract async getPrevUrl(): Promise<string | null>;
}
