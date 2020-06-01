/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { patchRulesSchema } from './patch_rules_schema';

export const patchRulesBulkSchema = Joi.array().items(patchRulesSchema);
