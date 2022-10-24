/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { RuleUpdateProps } from '../../../../../rule_schema';

/**
 * Request body parameters of the API route.
 */
export type BulkUpdateRulesRequestBody = t.TypeOf<typeof BulkUpdateRulesRequestBody>;
export const BulkUpdateRulesRequestBody = t.array(RuleUpdateProps);
