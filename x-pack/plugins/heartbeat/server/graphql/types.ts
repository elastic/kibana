/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { HBServerLibs } from '../lib/lib';

export interface IHBContext {
  req: Request;
}

export interface IHBGraphQLResolver {
  Query?: any;
}

export type ICreateHeartbeatGraphQLResolvers = (libs: HBServerLibs) => any;
