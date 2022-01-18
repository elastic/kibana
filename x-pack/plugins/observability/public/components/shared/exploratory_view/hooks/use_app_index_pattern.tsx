/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context, useState, useCallback, useMemo } from 'react';
import { HttpFetchError } from 'kibana/public';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { AppDataType } from '../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import { ObservabilityDataViews } from '../../../../utils/observability_data_views';
import { getDataHandler } from '../../../../data_handler';
import { useExploratoryView } from '../contexts/exploratory_view_config';
import { DataViewInsufficientAccessError } from '../../../../../../../../src/plugins/data_views/common';

export interface IndexPatternContext {
  loading: boolean;
  indexPatterns: IndexPatternState;
  indexPatternErrors: IndexPatternErrors;
  hasAppData: HasAppDataState;
  loadIndexPattern: (params: { dataType: AppDataType }) => void;
}

export const IndexPatternContext = createContext<Partial<IndexPatternContext>>({});

interface ProviderProps {
  children: JSX.Element;
}

type HasAppDataState = Record<AppDataType, boolean | undefined>;
export type IndexPatternState = Record<AppDataType, IndexPattern>;
export type IndexPatternErrors = Record<AppDataType, HttpFetchError>;
type LoadingState = Record<AppDataType, boolean>;

export function IndexPatternContextProvider({ children }: ProviderProps) {
  const [loading, setLoading] = useState<LoadingState>({} as LoadingState);
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternState>({} as IndexPatternState);
  const [indexPatternErrors, setIndexPatternErrors] = useState<IndexPatternErrors>(
    {} as IndexPatternErrors
  );
  const [hasAppData, setHasAppData] = useState<HasAppDataState>({} as HasAppDataState);

  const {
    services: { data },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const { indexPatterns: indexPatternsList } = useExploratoryView();

  const loadIndexPattern: IndexPatternContext['loadIndexPattern'] = useCallback(
    async ({ dataType }) => {
      if (typeof hasAppData[dataType] === 'undefined' && !loading[dataType]) {
        setLoading((prevState) => ({ ...prevState, [dataType]: true }));

        try {
          let hasDataT = false;
          let indices: string | undefined = '';
          if (indexPatternsList[dataType]) {
            indices = indexPatternsList[dataType];
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
              const resultApm = await getDataHandler('apm')?.hasData();
              hasDataT = Boolean(resultApm?.hasData);
              indices = resultApm?.indices.transaction;
              break;
          }
          setHasAppData((prevState) => ({ ...prevState, [dataType]: hasDataT }));

          if (hasDataT && indices) {
            const obsvIndexP = new ObservabilityDataViews(data);
            const indPattern = await obsvIndexP.getDataView(dataType, indices);

            setIndexPatterns((prevState) => ({ ...prevState, [dataType]: indPattern }));
          }
          setLoading((prevState) => ({ ...prevState, [dataType]: false }));
        } catch (e) {
          if (
            e instanceof DataViewInsufficientAccessError ||
            (e as HttpFetchError).body === 'Forbidden'
          ) {
            setIndexPatternErrors((prevState) => ({ ...prevState, [dataType]: e }));
          }
          setLoading((prevState) => ({ ...prevState, [dataType]: false }));
        }
      }
    },
    [data, hasAppData, indexPatternsList, loading]
  );

  return (
    <IndexPatternContext.Provider
      value={{
        hasAppData,
        indexPatterns,
        loadIndexPattern,
        indexPatternErrors,
        loading: !!Object.values(loading).find((loadingT) => loadingT),
      }}
    >
      {children}
    </IndexPatternContext.Provider>
  );
}

export const useAppIndexPatternContext = (dataType?: AppDataType) => {
  const { loading, hasAppData, loadIndexPattern, indexPatterns, indexPatternErrors } = useContext(
    IndexPatternContext as unknown as Context<IndexPatternContext>
  );

  if (dataType && !indexPatterns?.[dataType] && !loading) {
    loadIndexPattern({ dataType });
  }

  return useMemo(() => {
    return {
      hasAppData,
      loading,
      indexPatterns,
      indexPatternErrors,
      indexPattern: dataType ? indexPatterns?.[dataType] : undefined,
      hasData: dataType ? hasAppData?.[dataType] : undefined,
      loadIndexPattern,
    };
  }, [dataType, hasAppData, indexPatternErrors, indexPatterns, loadIndexPattern, loading]);
};
