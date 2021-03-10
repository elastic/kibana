/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context } from 'react';
import { IIndexPattern } from '../../../../../src/plugins/data/common';

export interface IIndexPatternContext {
  indexPattern: IIndexPattern;
}

export const IndexPatternContext = createContext<Partial<IIndexPatternContext>>({});

interface ProviderProps {
  indexPattern: IIndexPattern;
}

export const IndexPatternContextProvider: React.FC<ProviderProps> = ({
  children,
  indexPattern,
}) => {
  return (
    <IndexPatternContext.Provider
      value={{
        indexPattern,
      }}
    >
      {children}
    </IndexPatternContext.Provider>
  );
};

export const useIndexPatternContext = () =>
  useContext((IndexPatternContext as unknown) as Context<IIndexPatternContext>);
