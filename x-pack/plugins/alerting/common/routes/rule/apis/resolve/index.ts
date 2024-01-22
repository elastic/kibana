/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { resolveParamsSchema } from './schemas/latest';

export { resolveParamsSchema as resolveParamsSchemaV1 } from './schemas/v1';

export type { ResolveRuleResponse } from './types/latest';

export type { ResolveRuleResponse as ResolveRuleResponseV1 } from './types/v1';
