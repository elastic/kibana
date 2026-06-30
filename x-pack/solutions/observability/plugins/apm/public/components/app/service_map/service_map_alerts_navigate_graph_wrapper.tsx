/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { ServiceMapAlertsNavigateProvider } from '../../shared/service_map/service_map_alerts_navigate_context';
import { useServiceMapAlertsNavigateFactory } from './use_service_map_alerts_tab_href';

/** Wires alert-badge SPA navigation for service nodes on the map. */
export function ServiceMapAlertsNavigateGraphWrapper({ children }: { children: ReactNode }) {
  const makeAlertsNavigateHandler = useServiceMapAlertsNavigateFactory();

  return (
    <ServiceMapAlertsNavigateProvider makeAlertsNavigateHandler={makeAlertsNavigateHandler}>
      {children}
    </ServiceMapAlertsNavigateProvider>
  );
}
