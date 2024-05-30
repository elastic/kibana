/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import type { CasesContextState } from './cases_context_reducer';

export const CasesStateContext = React.createContext<CasesContextState | undefined>(undefined);

export const useCasesStateContext = () => {
  const casesStateContext = useContext(CasesStateContext);
  if (!casesStateContext) {
    throw new Error(
      'useCasesStateContext must be used within a CasesProvider and have a defined value. See https://github.com/elastic/kibana/blob/main/x-pack/plugins/cases/README.md#cases-ui'
    );
  }
  return casesStateContext;
};
