/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_QUERY_NAMES, useQueryTracker } from '../../../common/hooks/use_query_tracker';
import { RiskQueries } from '../../../../common/search_strategy';
import type { Params, Response } from './api';
import { getRiskScoreDeprecated } from './api';

export const useRiskScoreDeprecated = (
  isFeatureEnabled: boolean,
  factoryQueryType: RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore,
  defaultIndex?: string
) => {
  const entity = useMemo(
    () => (factoryQueryType === RiskQueries.hostsRiskScore ? 'host' : 'user'),
    [factoryQueryType]
  );

  const getDeprecated = useQueryTracker<Params, Response>(
    getRiskScoreDeprecated,
    API_QUERY_NAMES.GET_RISK_SCORE_DEPRECATED
  );

  const [isDeprecated, setIsDeprecated] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const abortCtrl = useRef(new AbortController());
  const searchDeprecated = useCallback(
    (indexName: string) => {
      const asyncSearch = async () => {
        try {
          abortCtrl.current = new AbortController();
          setLoading(true);
          const res = await getDeprecated({
            query: { indexName, entity },
            signal: abortCtrl.current.signal,
          });
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
    },
    [entity, getDeprecated]
  );

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
