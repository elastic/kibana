/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode, useState, useContext } from 'react';
import { HttpSetup, ChromeStart } from '@kbn/core/public';

import { Links } from '../../links';
import { Store, Payload, Validation } from '../types';
import { initialPayload } from './initial_payload';

interface AppContextProviderArgs {
  children: ReactNode;
  value: {
    http: HttpSetup;
    links: Links;
    chrome: ChromeStart;
  };
}

interface ContextValue {
  store: Store;
  updatePayload: (changes: Partial<Payload>) => void;
  services: {
    http: HttpSetup;
    chrome: ChromeStart;
  };
  links: Links;
}

const AppContext = createContext<ContextValue>(undefined as any);

const validatePayload = (payload: Payload): Validation => {
  const { index } = payload;

  // For now just validate that the user has entered an index.
  const indexExists = Boolean(index || index.trim());

  return {
    isValid: indexExists,
    fields: {
      index: indexExists,
    },
  };
};

export const AppContextProvider = ({
  children,
  value: { http, links, chrome },
}: AppContextProviderArgs) => {
  const PAINLESS_LAB_KEY = 'painlessLabState';

  const [store, setStore] = useState<Store>(() => {
    // Using a callback here ensures these values are only calculated on the first render.
    const defaultPayload = {
      ...initialPayload,
      ...JSON.parse(localStorage.getItem(PAINLESS_LAB_KEY) || '{}'),
    };

    return {
      payload: defaultPayload,
      validation: validatePayload(defaultPayload),
    };
  });

  const updatePayload = (changes: Partial<Payload>): void => {
    const nextPayload = {
      ...store.payload,
      ...changes,
    };
    // Persist state locally so we can load it up when the user reopens the app.
    localStorage.setItem(PAINLESS_LAB_KEY, JSON.stringify(nextPayload));

    setStore({
      payload: nextPayload,
      validation: validatePayload(nextPayload),
    });
  };

  return (
    <AppContext.Provider value={{ updatePayload, store, services: { http, chrome }, links }}>
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
