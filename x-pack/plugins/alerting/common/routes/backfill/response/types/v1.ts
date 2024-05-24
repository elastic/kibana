/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { backfillResponseSchemaV1, errorResponseSchemaV1 } from '..';

export type BackfillResponse = TypeOf<typeof backfillResponseSchemaV1>;
export type ErrorResponse = TypeOf<typeof errorResponseSchemaV1>;
