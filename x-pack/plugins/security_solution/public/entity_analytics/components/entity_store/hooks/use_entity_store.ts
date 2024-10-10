/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { EngineDescriptor } from '../../../../../common/api/entity_analytics';
import {
  RiskScoreEntity,
  getHostRiskIndex,
  getUserRiskIndex,
} from '../../../../../common/search_strategy';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useIsNewRiskScoreModuleInstalled } from '../../../api/hooks/use_risk_engine_status';
import { useRiskScoreFeatureStatus } from '../../../api/hooks/use_risk_score_feature_status';
import { useEntityEngineStatus } from './use_entity_engine_status';
import { useEntityStoreRoutes } from '../../../api/entity_store';

const ENTITY_STORE_ENABLEMENT_INIT = 'ENTITY_STORE_ENABLEMENT_INIT';
const ENTITY_ENGINE_STATUS_QUERY = 'ENTITY_ENGINE_STATUS_QUERY';
export const useEntityStoreStatus = () => {
  const spaceId = useSpaceId();
  const newRiskScore = useIsNewRiskScoreModuleInstalled();
  const defaultIndices =
    spaceId && !newRiskScore.isLoading && newRiskScore.installed !== undefined
      ? {
          host: getHostRiskIndex(spaceId, true, newRiskScore.installed),
          user: getUserRiskIndex(spaceId, true, newRiskScore.installed),
        }
      : undefined;
  const legacyUserRiskScore = useRiskScoreFeatureStatus(RiskScoreEntity.user, defaultIndices?.user);
  const legacyHostRiskScore = useRiskScoreFeatureStatus(RiskScoreEntity.host, defaultIndices?.host);

  const entityStore = useEntityEngineStatus();

  return {
    entityStore,
    legacyUserRiskScore,
    legacyHostRiskScore,
    newRiskScore,
  };
};

export const useEntityStoreEnablement = () => {
  const { getEntityEngine, initEntityStore } = useEntityStoreRoutes();
  const { refetch: poll, data } = useQuery<EngineDescriptor[]>({
    queryKey: [ENTITY_ENGINE_STATUS_QUERY],
    queryFn: () => {
      return Promise.all([getEntityEngine('user')]);
    },
    refetchInterval: (update) => {
      const shouldStopPolling = update && update.some((engine) => engine.status === 'started');
      return shouldStopPolling ? false : 5000; // TODO: increase interval
    },
    enabled: false,
  });

  const { refetch: initialize, fetchStatus: initFetchStatus } = useQuery({
    queryKey: [ENTITY_STORE_ENABLEMENT_INIT],
    queryFn: () => {
      return Promise.all([initEntityStore('user')]);
    },
    enabled: false,
  });

  const enableEntityStore = useCallback(() => initialize().then(poll), [initialize, poll]);

  return {
    loading:
      initFetchStatus === 'fetching' || data?.some((engine) => engine.status === 'installing'),
    data,
    enableEntityStore,
  };
};

export const useEntityStore = () => {
  const status = useEntityStoreStatus();
  const enablement = useEntityStoreEnablement();

  return {
    status,
    enablement,
  };
};
