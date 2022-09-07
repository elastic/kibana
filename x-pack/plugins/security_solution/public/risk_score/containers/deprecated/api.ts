/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../common/lib/kibana';
import { RISK_SCORE_DEPRECATION_API_URL } from '../../../../common/constants';

export const getRiskScoreDeprecated = async (
  indexName: string,
  entity: 'user' | 'host',
  signal?: AbortSignal
): Promise<{ isDeprecated: boolean; isEnabled: boolean }> => {
  return KibanaServices.get().http.fetch<{ isDeprecated: boolean; isEnabled: boolean }>(
    RISK_SCORE_DEPRECATION_API_URL,
    {
      method: 'GET',
      query: { indexName, entity },
      asSystemRequest: true,
      signal,
    }
  );
};
