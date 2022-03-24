/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useContext, useEffect, useCallback } from 'react';

import type { GetFleetStatusResponse } from '../types';

import { useConfig } from './use_config';
import { sendGetFleetStatus } from './use_request';

interface FleetStatusState {
  enabled: boolean;
  isLoading: boolean;
  isReady: boolean;
  error?: Error;
  missingRequirements?: GetFleetStatusResponse['missing_requirements'];
}

interface FleetStatus extends FleetStatusState {
  refresh: () => Promise<void>;
}

const FleetStatusContext = React.createContext<FleetStatus | undefined>(undefined);

export const FleetStatusProvider: React.FC = ({ children }) => {
  const config = useConfig();
  const [state, setState] = useState<FleetStatusState>({
    enabled: config.agents.enabled,
    isLoading: false,
    isReady: false,
  });
  const sendGetStatus = useCallback(
    async function sendGetStatus() {
      try {
        setState((s) => ({ ...s, isLoading: true }));
        const res = await sendGetFleetStatus();
        if (res.error) {
          throw res.error;
        }

        setState((s) => ({
          ...s,
          isLoading: false,
          isReady: res.data?.isReady ?? false,
          missingRequirements: res.data?.missing_requirements,
        }));
      } catch (error) {
        setState((s) => ({ ...s, isLoading: false, error }));
      }
    },
    [setState]
  );

  useEffect(() => {
    sendGetStatus();
  }, [sendGetStatus]);

  const refresh = useCallback(() => sendGetStatus(), [sendGetStatus]);

  return (
    <FleetStatusContext.Provider value={{ ...state, refresh }}>
      {children}
    </FleetStatusContext.Provider>
  );
};

export function useFleetStatus(): FleetStatus {
  const context = useContext(FleetStatusContext);

  if (!context) {
    throw new Error('FleetStatusContext not set');
  }

  return context;
}
