/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { createContext, useContext, useState } from 'react';

import { DocLinksStart } from './shared_imports';
import { IndexSettings } from './types';

interface ContextState {
  indexSettings: IndexSettings;
  docLinks?: DocLinksStart;
}

interface Context {
  value: ContextState;
  update: (value: ContextState) => void;
}

const ConfigContext = createContext<Context | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export const ConfigProvider = ({ children }: Props) => {
  const [state, setState] = useState<ContextState>({
    indexSettings: {},
  });

  return (
    <ConfigContext.Provider value={{ value: state, update: setState }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (ctx === undefined) {
    throw new Error('useConfig must be used within a <ConfigProvider />');
  }
  return ctx;
};
