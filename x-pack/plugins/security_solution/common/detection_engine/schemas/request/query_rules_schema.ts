/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { rule_id, id } from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const queryRulesSchema = t.exact(
  t.partial({
    rule_id,
    id,
  })
);

export type QueryRulesSchema = t.TypeOf<typeof queryRulesSchema>;
export type QueryRulesSchemaDecoded = QueryRulesSchema;
