/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import { errorSchema, warningSchema } from '../../../../schemas/response';

export type ImportRulesResponse = t.TypeOf<typeof ImportRulesResponse>;
export const ImportRulesResponse = t.exact(
  t.type({
    exceptions_success: t.boolean,
    exceptions_success_count: PositiveInteger,
    exceptions_errors: t.array(errorSchema),
    rules_count: PositiveInteger,
    success: t.boolean,
    success_count: PositiveInteger,
    errors: t.array(errorSchema),
    action_connectors_errors: t.array(errorSchema),
    action_connectors_warnings: t.array(warningSchema),
    action_connectors_success: t.boolean,
    action_connectors_success_count: PositiveInteger,
  })
);
