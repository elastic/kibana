/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';

const agentFlyoutContext = createContext<
  | {
      isEnrollmentFlyoutOpen: boolean;
      openEnrollmentFlyout: () => void;
      closeEnrollmentFlyout: () => void;
      isFleetServerFlyoutOpen: boolean;
      openFleetServerFlyout: () => void;
      closeFleetServerFlyout: () => void;
    }
  | undefined
>(undefined);

export const FlyoutContextProvider: React.FunctionComponent = ({ children }) => {
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState(false);
  const [isFleetServerFlyoutOpen, setIsFleetServerFlyoutOpen] = useState(false);

  return (
    <agentFlyoutContext.Provider
      value={{
        isEnrollmentFlyoutOpen,
        openEnrollmentFlyout: () => {
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
