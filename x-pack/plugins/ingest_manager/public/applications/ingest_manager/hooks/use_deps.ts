/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { IngestManagerSetupDeps, IngestManagerStartDeps } from '../../../plugin';

export const DepsContext = React.createContext<IngestManagerSetupDeps | null>(null);
export const StartDepsContext = React.createContext<IngestManagerStartDeps | null>(null);

export function useDeps() {
  const deps = useContext(DepsContext);
  if (deps === null) {
    throw new Error('DepsContext not initialized');
  }
  return deps;
}

export function useStartDeps() {
  const deps = useContext(StartDepsContext);
  if (deps === null) {
    throw new Error('StartDepsContext not initialized');
  }
  return deps;
}
