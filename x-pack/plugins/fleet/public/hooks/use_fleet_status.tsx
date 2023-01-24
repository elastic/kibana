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
  missingOptionalFeatures?: GetFleetStatusResponse['missing_optional_features'];
  packageVerificationKeyId?: GetFleetStatusResponse['package_verification_key_id'];
}

interface FleetStatus extends FleetStatusState {
  refresh: () => Promise<void>;

  // This flag allows us to opt into displaying the Fleet Server enrollment instructions even if
  // a healthy Fleet Server has been detected, so we can delay removing the enrollment UI until
  // some user action like clicking a "continue" button
  forceDisplayInstructions: boolean;
  setForceDisplayInstructions: React.Dispatch<boolean>;
}

const FleetStatusContext = React.createContext<FleetStatus | undefined>(undefined);

export const FleetStatusProvider: React.FC = ({ children }) => {
  const config = useConfig();
  const [forceDisplayInstructions, setForceDisplayInstructions] = useState(false);

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
          missingOptionalFeatures: res.data?.missing_optional_features,
          packageVerificationKeyId: res.data?.package_verification_key_id,
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
    <FleetStatusContext.Provider
      value={{ ...state, refresh, forceDisplayInstructions, setForceDisplayInstructions }}
    >
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
