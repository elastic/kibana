import React from 'react';
import type { ReactNode } from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { FETCH_STATUS } from '../../hooks/use_fetcher';
export interface ApmIndexSettingsContextValue {
    indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
    indexSettingsStatus: FETCH_STATUS;
}
export declare const ApmIndexSettingsContext: React.Context<Partial<ApmIndexSettingsContextValue>>;
export declare function ApmIndexSettingsContextProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
