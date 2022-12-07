/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext } from 'react';
import { ObservabilityAlertSearchBarDependencies, Services } from './types';

const ObservabilityAlertSearchBarContext = React.createContext<Services | null>(null);

export const ObservabilityAlertSearchBarProvider: FC<ObservabilityAlertSearchBarDependencies> = ({
  children,
  data: {
    query: {
      timefilter: { timefilter: timeFilterService },
    },
  },
  useToasts,
  triggersActionsUi: { getAlertsSearchBar: AlertsSearchBar },
}) => {
  const services = {
    timeFilterService,
    useToasts,
    AlertsSearchBar,
  };
  return (
    <ObservabilityAlertSearchBarContext.Provider value={services}>
      {children}
    </ObservabilityAlertSearchBarContext.Provider>
  );
};

export function useServices() {
  const context = useContext(ObservabilityAlertSearchBarContext);

  if (!context) {
    throw new Error(
      'ObservabilityAlertSearchBarContext is missing.  Ensure your component or React root is wrapped with ObservabilityAlertSearchBarProvider.'
    );
  }

  return context;
}
