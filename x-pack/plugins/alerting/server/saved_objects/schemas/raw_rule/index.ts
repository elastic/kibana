/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema';

import { rawRuleSchema } from './v2';
export type RawRule = TypeOf<typeof rawRuleSchema>;

export { rawRuleSchema as rawRuleSchemaV1 } from './v1';
export { rawRuleSchema as rawRuleSchemaV2 } from './v2';
