/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { buildHostNamesFilter, buildUserNamesFilter } from '../../../../common/search_strategy';
import type { HostRisk, UserRisk } from '../../../risk_score/containers';
import { useUserRiskScore, useHostRiskScore } from '../../../risk_score/containers';
import { useMlCapabilities } from '../ml/hooks/use_ml_capabilities';

const ONLY_FIRST_ITEM_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const useRiskScoreData = (data: TimelineEventsDetailsItem[]) => {
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;
  const { hostName, userName } = useBasicDataFromDetailsData(data);

  const hostNameFilterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const [hostRiskLoading, { data: hostRiskData, isModuleEnabled: isHostRiskModuleEnabled }] =
    useHostRiskScore({
      filterQuery: hostNameFilterQuery,
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: !hostNameFilterQuery || !isPlatinumOrTrialLicense,
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

  const [userRiskLoading, { data: userRiskData, isModuleEnabled: isUserRiskModuleEnabled }] =
    useUserRiskScore({
      filterQuery: userNameFilterQuery,
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: !userNameFilterQuery || !isPlatinumOrTrialLicense,
    });

  const userRisk: UserRisk = useMemo(
    () => ({
      loading: userRiskLoading,
      isModuleEnabled: isUserRiskModuleEnabled,
      result: userRiskData,
    }),
    [userRiskData, userRiskLoading, isUserRiskModuleEnabled]
  );

  return { userRisk, hostRisk };
};
