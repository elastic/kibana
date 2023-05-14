/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';

import { transformIdsSchema, CommonResponseStatusSchema } from './common';

export const reauthorizeTransformsRequestSchema = transformIdsSchema;
export type ReauthorizeTransformsRequestSchema = TypeOf<typeof reauthorizeTransformsRequestSchema>;
export type ReauthorizeTransformsResponseSchema = CommonResponseStatusSchema;
