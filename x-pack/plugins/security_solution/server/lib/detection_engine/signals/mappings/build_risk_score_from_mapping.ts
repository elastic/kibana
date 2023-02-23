/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import type { RiskScore, RiskScoreMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleMetadata } from '../../../../../common/detection_engine/rule_schema';
import type { SignalSource } from '../types';

export interface BuildRiskScoreFromMappingProps {
  eventSource: SignalSource;
  riskScore: RiskScore;
  riskScoreMapping: RiskScoreMapping | undefined;
}

export interface BuildRiskScoreFromMappingReturn {
  riskScore: RiskScore;
  riskScoreMeta: RuleMetadata; // TODO: Stricter types
}

/**
 * Calculates the final risk score for a detection alert based on:
 *   - source event object that can potentially contain fields representing risk score
 *   - the default score specified by the user
 *   - (optional) score mapping specified by the user ("map this field to the score")
 *
 * NOTE: Current MVP support is for mapping from a single field.
 */
export const buildRiskScoreFromMapping = ({
  eventSource,
  riskScore,
  riskScoreMapping,
}: BuildRiskScoreFromMappingProps): BuildRiskScoreFromMappingReturn => {
  if (!riskScoreMapping || !riskScoreMapping.length) {
    return defaultScore(riskScore);
  }

  // TODO: Expand by verifying fieldType from index via  doc._index
  const eventField = riskScoreMapping[0].field;
  const eventValue = get(eventField, eventSource);
  const eventValues = Array.isArray(eventValue) ? eventValue : [eventValue];

  const validNumbers = eventValues.map(toValidNumberOrMinusOne).filter((n) => n > -1);

  if (validNumbers.length > 0) {
    const maxNumber = getMaxOf(validNumbers);
    return overriddenScore(maxNumber);
  }

  return defaultScore(riskScore);
};

function toValidNumberOrMinusOne(value: unknown): number {
  if (typeof value === 'number' && isValidNumber(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const num = Number(value);
    if (isValidNumber(num)) {
      return num;
    }
  }

  return -1;
}

function isValidNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function getMaxOf(array: number[]) {
  // NOTE: It's safer to use reduce rather than Math.max(...array). The latter won't handle large input.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
  return array.reduce((a, b) => Math.max(a, b));
}

function defaultScore(riskScore: RiskScore): BuildRiskScoreFromMappingReturn {
  return { riskScore, riskScoreMeta: {} };
}

function overriddenScore(riskScore: RiskScore): BuildRiskScoreFromMappingReturn {
  return { riskScore, riskScoreMeta: { riskScoreOverridden: true } };
}
