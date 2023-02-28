/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const riskScoreResponseSchema = t.exact(
  t.type({
    '@timestamp': t.string,
    identifier_field: t.string,
    identifier_value: t.string,
    calculated_level: t.string,
    calculated_score: t.number,
    calculated_score_norm: t.number,
  })
);

export type RiskScoreResponseSchema = t.TypeOf<typeof riskScoreResponseSchema>;

export const riskScoresResponseSchema = t.array(riskScoreResponseSchema);

export type RiskScoresResponseSchema = t.TypeOf<typeof riskScoresResponseSchema>;
