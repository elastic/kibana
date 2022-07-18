/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';

import type { FlyoutMode } from '../components/agent_enrollment_flyout/types';

const agentFlyoutContext = createContext<
  | {
      defaultMode: FlyoutMode;
      isEnrollmentFlyoutOpen: boolean;
      openEnrollmentFlyout: (args?: { flyoutMode: FlyoutMode }) => void;
      closeEnrollmentFlyout: () => void;
      isFleetServerFlyoutOpen: boolean;
      openFleetServerFlyout: () => void;
      closeFleetServerFlyout: () => void;
    }
  | undefined
>(undefined);

export const FlyoutContextProvider: React.FunctionComponent = ({ children }) => {
  const [defaultMode, setDefaultMode] = useState<FlyoutMode>('standalone');
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState(false);
  const [isFleetServerFlyoutOpen, setIsFleetServerFlyoutOpen] = useState(false);

  return (
    <agentFlyoutContext.Provider
      value={{
        defaultMode,
        isEnrollmentFlyoutOpen,
        openEnrollmentFlyout: (args = { flyoutMode: 'standalone' }) => {
          setDefaultMode(args.flyoutMode);
          setIsEnrollmentFlyoutOpen(true);
        },
        closeEnrollmentFlyout: () => setIsEnrollmentFlyoutOpen(false),
        isFleetServerFlyoutOpen,
        openFleetServerFlyout: () => setIsFleetServerFlyoutOpen(true),
        closeFleetServerFlyout: () => setIsFleetServerFlyoutOpen(false),
      }}
    >
      {children}
    </agentFlyoutContext.Provider>
  );
};

export const useFlyoutContext = () => {
  const context = useContext(agentFlyoutContext);

  if (!context) {
    throw new Error('useFlyoutContext must be used within a FlyoutContextProvider');
  }

  return context;
};
