/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context, useState, useCallback, useMemo } from 'react';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { AppDataType } from '../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import { ObservabilityIndexPatterns } from '../utils/observability_index_patterns';
import { getDataHandler } from '../../../../data_handler';

export interface IIndexPatternContext {
  loading: boolean;
  selectedApp: AppDataType;
  indexPatterns: IndexPatternState;
  hasAppData: HasAppDataState;
  loadIndexPattern: (params: { dataType: AppDataType }) => void;
}

export const IndexPatternContext = createContext<Partial<IIndexPatternContext>>({});

interface ProviderProps {
  children: JSX.Element;
}

type HasAppDataState = Record<AppDataType, boolean | null>;
type IndexPatternState = Record<AppDataType, IndexPattern>;

export function IndexPatternContextProvider({ children }: ProviderProps) {
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppDataType>();
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternState>({} as IndexPatternState);
  const [hasAppData, setHasAppData] = useState<HasAppDataState>({
    infra_metrics: null,
    infra_logs: null,
    synthetics: null,
    ux: null,
    apm: null,
    mobile: null,
  } as HasAppDataState);

  const {
    services: { data },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const loadIndexPattern: IIndexPatternContext['loadIndexPattern'] = useCallback(
    async ({ dataType }) => {
      setSelectedApp(dataType);

      if (hasAppData[dataType] === null) {
        setLoading(true);
        try {
          let hasDataT = false;
          let indices: string | undefined = '';
          switch (dataType) {
            case 'ux':
            case 'synthetics':
              const resultUx = await getDataHandler(dataType)?.hasData();
              hasDataT = Boolean(resultUx?.hasData);
              indices = resultUx?.indices;
              break;
            case 'apm':
            case 'mobile':
              const resultApm = await getDataHandler('apm')?.hasData();
              hasDataT = Boolean(resultApm?.hasData);
              indices = resultApm?.indices['apm_oss.transactionIndices'];
              break;
          }
          setHasAppData((prevState) => ({ ...prevState, [dataType]: hasDataT }));

          if (hasDataT && indices) {
            const obsvIndexP = new ObservabilityIndexPatterns(data);
            const indPattern = await obsvIndexP.getIndexPattern(dataType, indices);

            setIndexPatterns((prevState) => ({ ...prevState, [dataType]: indPattern }));
          }
          setLoading(false);
        } catch (e) {
          setLoading(false);
        }
      }
    },
    [data, hasAppData]
  );

  return (
    <IndexPatternContext.Provider
      value={{
        loading,
        hasAppData,
        selectedApp,
        indexPatterns,
        loadIndexPattern,
      }}
    >
      {children}
    </IndexPatternContext.Provider>
  );
}

export const useAppIndexPatternContext = () => {
  const { selectedApp, loading, hasAppData, loadIndexPattern, indexPatterns } = useContext(
    (IndexPatternContext as unknown) as Context<IIndexPatternContext>
  );

  return useMemo(() => {
    return {
      hasAppData,
      selectedApp,
      loading,
      indexPattern: indexPatterns?.[selectedApp],
      hasData: hasAppData?.[selectedApp],
      loadIndexPattern,
    };
  }, [hasAppData, indexPatterns, loadIndexPattern, loading, selectedApp]);
};
