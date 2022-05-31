/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { createContext, useContext } from 'react';

export const coreStartContext = createContext<CoreStart | null>(null);

export const CoreStartProvider = coreStartContext.Provider;

export const useCore = () => {
  const core = useContext(coreStartContext);
  if (!core) {
    throw new Error('Core may only be used within core start provider');
  }

  return core;
};
