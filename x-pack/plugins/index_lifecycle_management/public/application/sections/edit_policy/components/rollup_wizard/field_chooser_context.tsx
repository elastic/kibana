/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, createContext, useContext, useState } from 'react';

export type Tab = 'search' | 'custom';

interface ContextValue {
  indexPattern: string;
  updateIndexPattern: (value: string) => void;
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
}

const FieldChooserContext = createContext<ContextValue>({
  indexPattern: '',
  updateIndexPattern: () => {},
  currentTab: 'search',
  setCurrentTab: () => {},
});

export const FieldChooserProvider: FunctionComponent = ({ children }) => {
  const [indexPattern, updateIndexPattern] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<Tab>('search');
  return (
    <FieldChooserContext.Provider
      value={{
        indexPattern,
        updateIndexPattern,
        currentTab,
        setCurrentTab,
      }}
    >
      {children}
    </FieldChooserContext.Provider>
  );
};

export const useFieldChooserContext = () => {
  const ctx = useContext(FieldChooserContext);
  if (!ctx) {
    throw new Error('"useFieldChooserContext" can only be used inside of a "FieldChooserProvider"');
  }
  return ctx;
};
