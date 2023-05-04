/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { CasesContext } from '.';

export const useCasesContext = () => {
  const casesContext = useContext(CasesContext);

  if (!casesContext) {
    throw new Error(
      'useCasesContext must be used within a CasesProvider and have a defined value. See https://github.com/elastic/kibana/blob/main/x-pack/plugins/cases/README.md#cases-ui'
    );
  }

  return casesContext;
};
