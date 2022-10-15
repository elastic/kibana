/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { createRulesSchema } from '../../../../schemas/request/rule_schemas';

export const createRulesBulkSchema = t.array(createRulesSchema);
export type CreateRulesBulkSchema = t.TypeOf<typeof createRulesBulkSchema>;
