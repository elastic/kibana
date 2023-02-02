/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import {
  buildHostNamesFilter,
  buildUserNamesFilter,
  RiskScoreEntity,
} from '../../../../common/search_strategy';
import type { HostRisk, UserRisk } from '../../../explore/containers/risk_score';
import { useRiskScore } from '../../../explore/containers/risk_score';

export const ONLY_FIRST_ITEM_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const useRiskScoreData = (data: TimelineEventsDetailsItem[]) => {
  const { hostName, userName } = useBasicDataFromDetailsData(data);

  const hostNameFilterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const {
    data: hostRiskData,
    loading: hostRiskLoading,
    isLicenseValid: isHostLicenseValid,
    isModuleEnabled: isHostRiskModuleEnabled,
  } = useRiskScore({
    filterQuery: hostNameFilterQuery,
    pagination: ONLY_FIRST_ITEM_PAGINATION,
    riskEntity: RiskScoreEntity.host,
    skip: !hostNameFilterQuery,
  });

  const hostRisk: HostRisk = useMemo(
    () => ({
      loading: hostRiskLoading,
      isModuleEnabled: isHostRiskModuleEnabled,
      result: hostRiskData,
    }),
    [hostRiskData, hostRiskLoading, isHostRiskModuleEnabled]
  );

  const userNameFilterQuery = useMemo(
    () => (userName ? buildUserNamesFilter([userName]) : undefined),
    [userName]
  );

  const {
    data: userRiskData,
    loading: userRiskLoading,
    isLicenseValid: isUserLicenseValid,
    isModuleEnabled: isUserRiskModuleEnabled,
  } = useRiskScore({
    filterQuery: userNameFilterQuery,
    pagination: ONLY_FIRST_ITEM_PAGINATION,
    riskEntity: RiskScoreEntity.user,
    skip: !userNameFilterQuery,
  });

  const userRisk: UserRisk = useMemo(
    () => ({
      loading: userRiskLoading,
      isModuleEnabled: isUserRiskModuleEnabled,
      result: userRiskData,
    }),
    [userRiskLoading, isUserRiskModuleEnabled, userRiskData]
  );

  return { userRisk, hostRisk, isLicenseValid: isHostLicenseValid && isUserLicenseValid };
};
