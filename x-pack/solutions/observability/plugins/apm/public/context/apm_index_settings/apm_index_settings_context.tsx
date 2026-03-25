/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import type { ReactNode } from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useFetcher } from '../../hooks/use_fetcher';
import type { ApmPluginStartDeps } from '../../plugin';

export interface ApmIndexSettingsContextValue {
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
  indexSettingsStatus: FETCH_STATUS;
}

export const ApmIndexSettingsContext = createContext<Partial<ApmIndexSettingsContextValue>>({});

export interface ApmIndexSettingsContextProviderProps {
  children: ReactNode;
  /** When provided (e.g. embeddable), use this instead of useKibana().services.apmSourcesAccess */
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}

export function ApmIndexSettingsContextProvider({
  children,
  apmSourcesAccess: apmSourcesAccessProp,
}: ApmIndexSettingsContextProviderProps) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const apmSourcesAccess = apmSourcesAccessProp ?? services?.apmSourcesAccess;

  const { data = { apmIndexSettings: [] }, status: indexSettingsStatus } = useFetcher(
    (_, signal) =>
      apmSourcesAccess ? apmSourcesAccess.getApmIndexSettings({ signal }) : undefined,
    [apmSourcesAccess]
  );

  return (
    <ApmIndexSettingsContext.Provider
      value={{
        indexSettings: data.apmIndexSettings,
        indexSettingsStatus,
      }}
    >
      {children}
    </ApmIndexSettingsContext.Provider>
  );
}
