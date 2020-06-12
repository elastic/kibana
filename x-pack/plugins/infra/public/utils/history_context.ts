/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { ScopedHistory } from 'src/core/public';

export const HistoryContext = createContext<ScopedHistory | undefined>(undefined);

export const useHistory = () => {
  return useContext(HistoryContext);
};
