/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context, useState, useCallback, useMemo } from 'react';
import { HttpFetchError } from 'kibana/public';
import type { DataView } from '../../../../../../../../src/plugins/data_views/common';
import { AppDataType } from '../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import { ObservabilityDataViews } from '../../../../utils/observability_data_views';
import { getDataHandler } from '../../../../data_handler';
import { useExploratoryView } from '../contexts/exploratory_view_config';
import { DataViewInsufficientAccessError } from '../../../../../../../../src/plugins/data_views/common';
import { getApmDataViewTitle } from '../utils/utils';

export interface DataViewContext {
  loading: boolean;
  dataViews: DataViewState;
  dataViewErrors: DataViewErrors;
  hasAppData: HasAppDataState;
  loadDataView: (params: { dataType: AppDataType }) => void;
}

export const DataViewContext = createContext<Partial<DataViewContext>>({});

interface ProviderProps {
  children: JSX.Element;
}

type HasAppDataState = Record<AppDataType, boolean | undefined>;
export type DataViewState = Record<AppDataType, DataView>;
export type DataViewErrors = Record<AppDataType, HttpFetchError>;
type LoadingState = Record<AppDataType, boolean>;

export function DataViewContextProvider({ children }: ProviderProps) {
  const [loading, setLoading] = useState<LoadingState>({} as LoadingState);
  const [dataViews, setDataViews] = useState<DataViewState>({} as DataViewState);
  const [dataViewErrors, setDataViewErrors] = useState<DataViewErrors>({} as DataViewErrors);
  const [hasAppData, setHasAppData] = useState<HasAppDataState>({} as HasAppDataState);

  const {
    services: { dataViews: dataViewsService },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const { dataViews: dataViewsList } = useExploratoryView();

  const loadDataView: DataViewContext['loadDataView'] = useCallback(
    async ({ dataType }) => {
      if (typeof hasAppData[dataType] === 'undefined' && !loading[dataType]) {
        setLoading((prevState) => ({ ...prevState, [dataType]: true }));

        try {
          let hasDataT = false;
          let indices: string | undefined = '';
          if (dataViewsList[dataType]) {
            indices = dataViewsList[dataType];
            hasDataT = true;
          }
          switch (dataType) {
            case 'ux':
            case 'synthetics':
              const resultUx = await getDataHandler(dataType)?.hasData();
              hasDataT = Boolean(resultUx?.hasData);
              indices = resultUx?.indices;
              break;
            case 'infra_metrics':
              const resultMetrics = await getDataHandler(dataType)?.hasData();
              hasDataT = Boolean(resultMetrics?.hasData);
              indices = resultMetrics?.indices;
              break;
            case 'apm':
            case 'mobile':
              const resultApm = await getDataHandler('apm')!.hasData();
              hasDataT = Boolean(resultApm?.hasData);
              indices = getApmDataViewTitle(resultApm?.indices);
              break;
          }
          setHasAppData((prevState) => ({ ...prevState, [dataType]: hasDataT }));

          if (hasDataT && indices) {
            const obsvDataV = new ObservabilityDataViews(dataViewsService);
            const dataV = await obsvDataV.getDataView(dataType, indices);

            setDataViews((prevState) => ({ ...prevState, [dataType]: dataV }));
          }
          setLoading((prevState) => ({ ...prevState, [dataType]: false }));
        } catch (e) {
          if (
            e instanceof DataViewInsufficientAccessError ||
            (e as HttpFetchError).body === 'Forbidden'
          ) {
            setDataViewErrors((prevState) => ({ ...prevState, [dataType]: e }));
          }
          setLoading((prevState) => ({ ...prevState, [dataType]: false }));
        }
      }
    },
    [dataViewsService, hasAppData, dataViewsList, loading]
  );

  return (
    <DataViewContext.Provider
      value={{
        hasAppData,
        dataViews,
        loadDataView,
        dataViewErrors,
        loading: !!Object.values(loading).find((loadingT) => loadingT),
      }}
    >
      {children}
    </DataViewContext.Provider>
  );
}

export const useAppDataViewContext = (dataType?: AppDataType) => {
  const { loading, hasAppData, loadDataView, dataViews, dataViewErrors } = useContext(
    DataViewContext as unknown as Context<DataViewContext>
  );

  if (dataType && !dataViews?.[dataType] && !loading) {
    loadDataView({ dataType });
  }

  return useMemo(() => {
    return {
      hasAppData,
      loading,
      dataViews,
      dataViewErrors,
      dataView: dataType ? dataViews?.[dataType] : undefined,
      hasData: dataType ? hasAppData?.[dataType] : undefined,
      loadDataView,
    };
  }, [dataType, hasAppData, dataViewErrors, dataViews, loadDataView, loading]);
};
