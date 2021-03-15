/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context, useState, useMemo, useEffect } from 'react';
import { IIndexPattern } from '../../../../../src/plugins/data/common';
import { AppDataType } from '../components/shared/exploratory_view/types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../plugin';

export interface IIndexPatternContext {
  indexPattern: IIndexPattern;
  loadIndexPattern: (dataType: AppDataType) => void;
}

export const IndexPatternContext = createContext<Partial<IIndexPatternContext>>({});

interface ProviderProps {
  indexPattern: IIndexPattern;
}

export const IndexPatternContextProvider: React.FC<ProviderProps> = ({
  children,
  indexPattern: initialIndexPattern,
}) => {
  const [indexPattern, setIndexPattern] = useState(initialIndexPattern);

  useEffect(() => {
    setIndexPattern(initialIndexPattern);
  }, [initialIndexPattern]);

  const {
    services: { data },
  } = useKibana<ObservabilityClientPluginsStart>();

  const loadIndexPattern = async (dataType: AppDataType) => {
    if (dataType === 'synthetics') {
      const newIndexPattern = await data.indexPatterns.get('df32db00-819e-11eb-87f5-d7da22b1dde3');
      setIndexPattern(newIndexPattern);
    }
  };

  const value = useMemo(() => {
    return {
      indexPattern,
      loadIndexPattern,
    };
  }, [indexPattern]);

  return <IndexPatternContext.Provider value={value}>{children}</IndexPatternContext.Provider>;
};

export const useIndexPatternContext = () => {
  return useContext((IndexPatternContext as unknown) as Context<IIndexPatternContext>);
};
