/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RiskScoreEntity,
  getHostRiskIndex,
  getUserRiskIndex,
} from '../../../common/search_strategy';
import { useSpaceId } from '../../common/hooks/use_space_id';

export const useGetDefaulRiskIndex = (
  riskEntity: RiskScoreEntity,
  onlyLatest: boolean = true
): string | undefined => {
  const spaceId = useSpaceId();

  if (!spaceId) {
    return undefined;
  }

  return riskEntity === RiskScoreEntity.host
    ? getHostRiskIndex(spaceId, onlyLatest)
    : getUserRiskIndex(spaceId, onlyLatest);
};
