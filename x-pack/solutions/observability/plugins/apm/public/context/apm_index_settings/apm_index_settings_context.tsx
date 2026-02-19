/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import type { ReactNode } from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { FETCH_STATUS } from '../../hooks/use_fetcher';

export interface ApmIndexSettingsContextValue {
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
  indexSettingsStatus: FETCH_STATUS;
}

export const ApmIndexSettingsContext = createContext<Partial<ApmIndexSettingsContextValue>>({});

export function ApmIndexSettingsContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ApmIndexSettingsContextValue;
}) {
  return (
    <ApmIndexSettingsContext.Provider value={value}>{children}</ApmIndexSettingsContext.Provider>
  );
}
