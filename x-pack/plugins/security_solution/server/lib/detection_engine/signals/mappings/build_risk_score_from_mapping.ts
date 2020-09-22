/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
//Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { get } from 'lodash/fp';
import {
  Meta,
  RiskScore,
  RiskScoreMappingOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { SignalSourceHit } from '../types';

interface BuildRiskScoreFromMappingProps {
  doc: SignalSourceHit;
  riskScore: RiskScore;
  riskScoreMapping: RiskScoreMappingOrUndefined;
}

interface BuildRiskScoreFromMappingReturn {
  riskScore: RiskScore;
  riskScoreMeta: Meta; // TODO: Stricter types
}

export const buildRiskScoreFromMapping = ({
  doc,
  riskScore,
  riskScoreMapping,
}: BuildRiskScoreFromMappingProps): BuildRiskScoreFromMappingReturn => {
  // MVP support is for mapping from a single field
  if (riskScoreMapping != null && riskScoreMapping.length > 0) {
    const mappedField = riskScoreMapping[0].field;
    // TODO: Expand by verifying fieldType from index via  doc._index
    const mappedValue = get(mappedField, doc._source);
    if (
      typeof mappedValue === 'number' &&
      Number.isSafeInteger(mappedValue) &&
      mappedValue >= 0 &&
      mappedValue <= 100
    ) {
      return { riskScore: mappedValue, riskScoreMeta: { riskScoreOverridden: true } };
    }
  }
  return { riskScore, riskScoreMeta: {} };
};
