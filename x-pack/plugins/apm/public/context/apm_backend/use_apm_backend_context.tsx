/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext } from 'react';
import { ApmBackendContext } from './apm_backend_context';

export function useApmBackendContext() {
  const context = useContext(ApmBackendContext);

  if (!context) {
    throw new Error(
      'ApmBackendContext has no set value, did you forget rendering ApmBackendContextProvider?'
    );
  }

  return context;
}
