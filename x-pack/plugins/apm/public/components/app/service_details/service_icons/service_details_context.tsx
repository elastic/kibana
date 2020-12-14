/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useState,
} from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';

export type IconsReponseType = APIReturnType<'GET /api/apm/services/{serviceName}/icons'>;
export type ServiceDetailsReponseType = APIReturnType<'GET /api/apm/services/{serviceName}'>;

interface ServiceDetailsContext {
  icons?: IconsReponseType;
  iconsFetchStatus: FETCH_STATUS;
  details?: ServiceDetailsReponseType;
  detailsFetchStatus: FETCH_STATUS;
  fetchServiceDetails: Dispatch<SetStateAction<boolean>>;
}

export const ServiceDetailsContext = createContext({} as ServiceDetailsContext);

export function ServiceDetailsContextProvider({
  children,
  serviceName,
}: {
  serviceName: string;
  children: React.ReactNode;
}) {
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end } = urlParams;
  const [fetchServiceDetails, setFetchServiceDetails] = useState(false);

  const { data: icons, status: iconsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/icons',
          params: {
            path: { serviceName },
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  const { data: details, status: detailsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (fetchServiceDetails && serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}',
          params: {
            path: { serviceName },
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
    },
    [fetchServiceDetails, serviceName, start, end, uiFilters]
  );

  return (
    <ServiceDetailsContext.Provider
      value={{
        icons,
        iconsFetchStatus,
        details,
        fetchServiceDetails: setFetchServiceDetails,
        detailsFetchStatus,
      }}
      children={children}
    />
  );
}
