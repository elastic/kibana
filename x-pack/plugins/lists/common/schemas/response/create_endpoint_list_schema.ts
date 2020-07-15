/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { exceptionListSchema } from './exception_list_schema';

export const createEndpointListSchema = t.union([exceptionListSchema, t.exact(t.type({}))]);

export type CreateEndpointListSchema = t.TypeOf<typeof createEndpointListSchema>;
