/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';

import { transformIdsSchema, CommonResponseStatusSchema } from './common';

export const startTransformsRequestSchema = transformIdsSchema;
export type StartTransformsRequestSchema = TypeOf<typeof startTransformsRequestSchema>;
export type StartTransformsResponseSchema = CommonResponseStatusSchema;
