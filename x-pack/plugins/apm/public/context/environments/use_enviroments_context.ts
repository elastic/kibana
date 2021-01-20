/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { EnvironmentsContext } from './environments_context';

export function useEnvironmentsContext() {
  const context = useContext(EnvironmentsContext);
  if (!context) {
    throw new Error('EnvironmentContext not found');
  }
  return context;
}
