/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../../common/lib/kibana';
import { RISK_SCORE_INDEX_STATUS_API_URL } from '../../../../../common/constants';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';

export const getRiskScoreIndexStatus = async (params: {
  query: {
    indexName: string;
    entity: RiskScoreEntity;
  };
  signal?: AbortSignal;
}): Promise<{
  isDeprecated: boolean;
  isEnabled: boolean;
}> => {
  const { indexName, entity } = params.query;
  return KibanaServices.get().http.fetch<{ isDeprecated: boolean; isEnabled: boolean }>(
    RISK_SCORE_INDEX_STATUS_API_URL,
    {
      method: 'GET',
      query: { indexName, entity },
      asSystemRequest: true,
      signal: params.signal,
    }
  );
};
