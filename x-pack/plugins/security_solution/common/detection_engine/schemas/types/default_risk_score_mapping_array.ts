/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
// eslint-disable-next-line @typescript-eslint/camelcase
import { risk_score_mapping, RiskScoreMapping } from '../common/schemas';

/**
 * Types the DefaultStringArray as:
 *   - If null or undefined, then a default risk_score_mapping array will be set
 */
export const DefaultRiskScoreMappingArray = new t.Type<RiskScoreMapping, RiskScoreMapping, unknown>(
  'DefaultRiskScoreMappingArray',
  risk_score_mapping.is,
  (input, context): Either<t.Errors, RiskScoreMapping> =>
    input == null ? t.success([]) : risk_score_mapping.validate(input, context),
  t.identity
);

export type DefaultRiskScoreMappingArrayC = typeof DefaultRiskScoreMappingArray;
