/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { risk_score, risk_score_mapping } from '@kbn/securitysolution-io-ts-alerting-types';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RiskScore = t.TypeOf<typeof RiskScore>;
export const RiskScore = risk_score;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RiskScoreMapping = t.TypeOf<typeof RiskScoreMapping>;
export const RiskScoreMapping = risk_score_mapping;
