/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context, useState, useEffect } from 'react';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { AppDataType } from '../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import { ObservabilityIndexPatterns } from '../../../../utils/observability_index_patterns';

export interface IIndexPatternContext {
  indexPattern: IndexPattern;
  loadIndexPattern: (dataType: AppDataType) => void;
}

export const IndexPatternContext = createContext<Partial<IIndexPatternContext>>({});

interface ProviderProps {
  indexPattern?: IndexPattern;
  children: JSX.Element;
}

export function IndexPatternContextProvider({
  children,
  indexPattern: initialIndexPattern,
}: ProviderProps) {
  const [indexPattern, setIndexPattern] = useState(initialIndexPattern);

  useEffect(() => {
    setIndexPattern(initialIndexPattern);
  }, [initialIndexPattern]);

  const {
    services: { data },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const loadIndexPattern = async (dataType: AppDataType) => {
    const obsvIndexP = new ObservabilityIndexPatterns(data);
    const indPattern = await obsvIndexP.getIndexPattern(dataType);
    setIndexPattern(indPattern!);
  };

  return (
    <IndexPatternContext.Provider
      value={{
        indexPattern,
        loadIndexPattern,
      }}
    >
      {children}
    </IndexPatternContext.Provider>
  );
}

export const useIndexPatternContext = () => {
  return useContext((IndexPatternContext as unknown) as Context<IIndexPatternContext>);
};
