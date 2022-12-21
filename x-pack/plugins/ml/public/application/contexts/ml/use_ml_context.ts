/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';

import { MlContext, MlContextValue } from './ml_context';

export const useMlContext = () => {
  const context = useContext(MlContext);

  if (
    context.combinedQuery === undefined ||
    context.currentDataView === undefined ||
    context.currentSavedSearch === undefined ||
    context.dataViewsContract === undefined ||
    context.kibanaConfig === undefined
  ) {
    throw new Error('required attribute is undefined');
  }

  return context as MlContextValue;
};
