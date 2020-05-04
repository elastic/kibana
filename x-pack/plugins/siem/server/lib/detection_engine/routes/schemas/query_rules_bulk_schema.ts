/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';

import { queryRulesSchema } from './query_rules_schema';

export const queryRulesBulkSchema = Joi.array().items(queryRulesSchema);
