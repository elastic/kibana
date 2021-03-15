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
import { ObservabilityIndexPatterns } from '../utils/observability_Index_patterns';

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
    const obsvIndexP = new ObservabilityIndexPatterns(data);
    const indPattern = await obsvIndexP.getIndexPattern(dataType);
    setIndexPattern(indPattern!);
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
