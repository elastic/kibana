/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoresCalculationResponse } from '../../../../common/api/entity_analytics';
import type { AfterKeys, EntityAfterKey } from '../../../../common/api/entity_analytics/common';
import type { IdentifierType } from '../../../../common/entity_analytics/risk_engine';

export const getFieldForIdentifier = (identifierType: IdentifierType): string =>
  identifierType === 'host' ? 'host.name' : 'user.name';

export const getAfterKeyForIdentifierType = ({
  afterKeys,
  identifierType,
}: {
  afterKeys: AfterKeys;
  identifierType: IdentifierType;
}): EntityAfterKey | undefined => afterKeys[identifierType];

export const isRiskScoreCalculationComplete = (result: RiskScoresCalculationResponse): boolean =>
  Object.keys(result.after_keys.host ?? {}).length === 0 &&
  Object.keys(result.after_keys.user ?? {}).length === 0;
