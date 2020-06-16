/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { canStartTrial } from '../../../license_management/public/application/lib/es';

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
        const response = await canStartTrial(services.http);
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
