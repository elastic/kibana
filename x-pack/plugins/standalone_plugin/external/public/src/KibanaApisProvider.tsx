/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { PropsWithChildren } from 'react';

export interface KibanaApis {
  data: {
    search: VoidFunction;
  };
}

export const KibanaApisContext = React.createContext<KibanaApis | undefined>(undefined);

export function assertIsKibanaApis(api: unknown): asserts api is KibanaApis {
  if (typeof api !== 'object' || api === null) {
    throw new Error(`Expected Kibana APIs, got ${typeof api}`);
  }

  if (typeof (api as KibanaApis).data?.search !== 'function') {
    throw new Error(`Expected Kibana APIs, got ${typeof api}`);
  }
}

export const KibanaApisProvider: React.FC<PropsWithChildren<{ api: KibanaApis }>> = ({
  children,
  api,
}) => {
  return <KibanaApisContext.Provider value={api}>{children}</KibanaApisContext.Provider>;
};

export const useKibanaApis = () => {
  const apis = React.useContext(KibanaApisContext);

  if (apis === undefined) {
    throw new Error('useKibanaApis must be used within a KibanaApisProvider');
  }

  return apis;
};
