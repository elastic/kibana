/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useMemo, useState, useEffect } from 'react';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useTrackedPromise } from '../../../hooks/use_tracked_promise';
import {
  getMlCapabilitiesResponsePayloadRT,
  GetMlCapabilitiesResponsePayload,
} from './api/ml_api_types';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const useLogAnalysisCapabilities = () => {
  const { services } = useKibanaContextForPlugin();
  const [mlCapabilities, setMlCapabilities] =
    useState<GetMlCapabilitiesResponsePayload>(initialMlCapabilities);

  const [fetchMlCapabilitiesRequest, fetchMlCapabilities] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        const rawResponse = await services.http.fetch('/internal/ml/ml_capabilities', {
          version: '1',
        });

        return decodeOrThrow(getMlCapabilitiesResponsePayloadRT)(rawResponse);
      },
      onResolve: (response) => {
        setMlCapabilities(response);
      },
    },
    []
  );

  useEffect(() => {
    fetchMlCapabilities();
  }, [fetchMlCapabilities]);

  const isLoading = useMemo(
    () => fetchMlCapabilitiesRequest.state === 'pending',
    [fetchMlCapabilitiesRequest.state]
  );

  const hasLogAnalysisSetupCapabilities = mlCapabilities.capabilities.canCreateJob;
  const hasLogAnalysisReadCapabilities = mlCapabilities.capabilities.canGetJobs;
  const hasLogAnalysisCapabilites =
    mlCapabilities.isPlatinumOrTrialLicense && mlCapabilities.mlFeatureEnabledInSpace;

  return {
    hasLogAnalysisCapabilites,
    hasLogAnalysisReadCapabilities,
    hasLogAnalysisSetupCapabilities,
    isLoading,
  };
};

export const [LogAnalysisCapabilitiesProvider, useLogAnalysisCapabilitiesContext] = createContainer(
  useLogAnalysisCapabilities
);

const initialMlCapabilities = {
  capabilities: {
    canGetJobs: false,
    canCreateJob: false,
    canDeleteJob: false,
    canOpenJob: false,
    canCloseJob: false,
    canForecastJob: false,
    canGetDatafeeds: false,
    canStartStopDatafeed: false,
    canUpdateJob: false,
    canUpdateDatafeed: false,
    canPreviewDatafeed: false,
    canGetCalendars: false,
    canCreateCalendar: false,
    canDeleteCalendar: false,
    canGetFilters: false,
    canCreateFilter: false,
    canDeleteFilter: false,
    canFindFileStructure: false,
    canGetDataFrameJobs: false,
    canDeleteDataFrameJob: false,
    canPreviewDataFrameJob: false,
    canCreateDataFrameJob: false,
    canStartStopDataFrameJob: false,
  },
  isPlatinumOrTrialLicense: false,
  mlFeatureEnabledInSpace: false,
  upgradeInProgress: false,
};
