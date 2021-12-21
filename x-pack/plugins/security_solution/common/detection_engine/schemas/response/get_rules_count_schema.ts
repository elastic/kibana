/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const getRulesCountResponseSchema = t.exact(
  t.type({
    elastic_rules_count: t.number,
    custom_rules_count: t.number,
  })
);

export type GetRulesCountResponse = t.TypeOf<typeof getRulesCountResponseSchema>;
