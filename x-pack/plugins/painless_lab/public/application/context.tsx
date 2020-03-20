/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, ReactNode, useState, useContext } from 'react';
import { HttpSetup } from 'src/core/public';

import { Links } from '../links';
import { exampleScript, painlessContextOptions } from './constants';
import { Store } from './types';

interface AppContextProviderArgs {
  children: ReactNode;
  value: {
    http: HttpSetup;
    links: Links;
  };
}

const PAINLESS_LAB_KEY = 'painlessLabState';

const initialState = {
  context: painlessContextOptions[0].value,
  code: exampleScript,
  parameters: `{
  "string-parameter": "yay",
  "number-parameter": 1.5,
  "boolean-parameter": true
}`,
  index: 'default-index',
  document: `{
  "my-field": "field-value"
}`,
  query: '',
};

interface ContextValue {
  state: Store;
  updateState: (changes: Partial<Store>) => void;
  services: {
    http: HttpSetup;
  };
  links: Links;
}

const AppContext = createContext<ContextValue>(undefined as any);

export const AppContextProvider = ({
  children,
  value: { http, links, chrome },
}: AppContextProviderArgs) => {
  const [state, setState] = useState<Store>(() => ({
    ...initialState,
    ...JSON.parse(localStorage.getItem(PAINLESS_LAB_KEY) || '{}'),
  }));

  const updateState = (changes: Partial<Store>): void => {
    const nextState = {
      ...state,
      ...changes,
    };
    localStorage.setItem(PAINLESS_LAB_KEY, JSON.stringify(nextState));
    setState(() => nextState);
  };

  return (
    <AppContext.Provider value={{ updateState, state, services: { http, chrome }, links }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('AppContext can only be used inside of AppContextProvider!');
  }
  return ctx;
};
