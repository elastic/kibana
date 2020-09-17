/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { createContext, useContext, useState } from 'react';

import { IndexSettings } from './types';

const IndexSettingsContext = createContext<
  { value: IndexSettings; update: (value: IndexSettings) => void } | undefined
>(undefined);

interface Props {
  children: React.ReactNode;
}

export const IndexSettingsProvider = ({ children }: Props) => {
  const [state, setState] = useState<IndexSettings>({});

  return (
    <IndexSettingsContext.Provider value={{ value: state, update: setState }}>
      {children}
    </IndexSettingsContext.Provider>
  );
};

export const useIndexSettings = () => {
  const ctx = useContext(IndexSettingsContext);
  if (ctx === undefined) {
    throw new Error('useIndexSettings must be used within a <IndexSettingsProvider />');
  }
  return ctx;
};
