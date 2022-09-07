/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiskQueries } from '../../../../common/search_strategy';
import { getRiskScoreDeprecated } from './api';

export const useRiskScoreDeprecated = (
  isFeatureEnabled: boolean,
  factoryQueryType: RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore,
  defaultIndex?: string
) => {
  const riskEntity = useMemo(
    () => (factoryQueryType === RiskQueries.hostsRiskScore ? 'host' : 'user'),
    [factoryQueryType]
  );

  const [isDeprecated, setIsDeprecated] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const abortCtrl = useRef(new AbortController());
  const searchDeprecated = useCallback((indexName: string) => {
    const asyncSearch = async () => {
      try {
        abortCtrl.current = new AbortController();
        setLoading(true);
        const res = await getRiskScoreDeprecated(indexName, riskEntity, abortCtrl.current.signal);
        setLoading(false);
        setIsDeprecated(res.isDeprecated);
        setIsEnabled(res.isEnabled);
      } catch (e) {
        setLoading(false);
        setIsDeprecated(false);
      }
    };
    abortCtrl.current.abort();
    asyncSearch();
  }, []);

  useEffect(() => {
    if (isFeatureEnabled && defaultIndex != null) {
      searchDeprecated(defaultIndex);
    }
  }, [isFeatureEnabled, defaultIndex, searchDeprecated]);

  useEffect(() => {
    return () => {
      abortCtrl.current.abort();
    };
  }, []);

  return { loading, isDeprecated, isEnabled, refetch: searchDeprecated };
};
