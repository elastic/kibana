/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMemo, useState, useEffect } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { npStart } from '../../../legacy_singletons';
import {
  getMlCapabilitiesResponsePayloadRT,
  GetMlCapabilitiesResponsePayload,
} from './api/ml_api_types';
import { throwErrors, createPlainError } from '../../../../common/runtime_types';

export const useLogAnalysisCapabilities = () => {
  const [mlCapabilities, setMlCapabilities] = useState<GetMlCapabilitiesResponsePayload>(
    initialMlCapabilities
  );

  const [fetchMlCapabilitiesRequest, fetchMlCapabilities] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        const rawResponse = await npStart.http.fetch('/api/ml/ml_capabilities');

        return pipe(
          getMlCapabilitiesResponsePayloadRT.decode(rawResponse),
          fold(throwErrors(createPlainError), identity)
        );
      },
      onResolve: response => {
        setMlCapabilities(response);
      },
    },
    []
  );

  useEffect(() => {
    fetchMlCapabilities();
  }, [fetchMlCapabilities]);

  const isLoading = useMemo(() => fetchMlCapabilitiesRequest.state === 'pending', [
    fetchMlCapabilitiesRequest.state,
  ]);

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
