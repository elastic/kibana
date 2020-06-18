/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { API_BASE_PATH as LICENSE_MANAGEMENT_API_BASE_PATH } from '../../../license_management/common/constants';

export enum TrialStatusLoadState {
  Loading = 'loading',
  Ok = 'ok',
  Error = 'error',
}

interface UseTrialStatusState {
  loadState: TrialStatusLoadState;
  isTrialAvailable: boolean;
}

export function useTrialStatus(): UseTrialStatusState {
  const { services } = useKibana();

  const [loadState, setLoadState] = useState<TrialStatusLoadState>(TrialStatusLoadState.Loading);
  const [isTrialAvailable, setIsTrialAvailable] = useState<boolean>(false);

  useEffect(() => {
    async function fetchTrial() {
      try {
        const response = await services.http.get(`${LICENSE_MANAGEMENT_API_BASE_PATH}/start_trial`);
        setIsTrialAvailable(response);
        setLoadState(TrialStatusLoadState.Ok);
      } catch {
        setLoadState(TrialStatusLoadState.Error);
      }
    }
    fetchTrial();
  }, [services.http]);

  return {
    loadState,
    isTrialAvailable,
  };
}
