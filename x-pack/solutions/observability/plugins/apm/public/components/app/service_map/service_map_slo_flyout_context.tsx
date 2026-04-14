/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import type { AgentName } from '@kbn/elastic-agent-utils';

export type ServiceMapSloBadgeClickHandler = (serviceName: string, agentName?: AgentName) => void;

interface ServiceMapSloFlyoutContextValue {
  onSloBadgeClick?: ServiceMapSloBadgeClickHandler;
}

const ServiceMapSloFlyoutContext = createContext<ServiceMapSloFlyoutContextValue>({});

export function ServiceMapSloFlyoutProvider({
  children,
  onSloBadgeClick,
}: {
  children: ReactNode;
  onSloBadgeClick: ServiceMapSloBadgeClickHandler;
}) {
  return (
    <ServiceMapSloFlyoutContext.Provider value={{ onSloBadgeClick }}>
      {children}
    </ServiceMapSloFlyoutContext.Provider>
  );
}

export function useServiceMapSloFlyout() {
  return useContext(ServiceMapSloFlyoutContext);
}
