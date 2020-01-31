/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { IngestManagerSetupDeps } from '../../../plugin';

export const DepsContext = React.createContext<IngestManagerSetupDeps | null>(null);

export function useDeps() {
  const deps = useContext(DepsContext);
  if (deps === null) {
    throw new Error('DepsContext not initialized');
  }
  return deps;
}
