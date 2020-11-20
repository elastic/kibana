/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { FleetSetupDeps, FleetStartDeps } from '../../../plugin';

export const DepsContext = React.createContext<{
  setup: FleetSetupDeps;
  start: FleetStartDeps;
} | null>(null);

export function useSetupDeps() {
  const deps = useContext(DepsContext);
  if (deps === null) {
    throw new Error('DepsContext not initialized');
  }
  return deps.setup;
}

export function useStartDeps() {
  const deps = useContext(DepsContext);
  if (deps === null) {
    throw new Error('StartDepsContext not initialized');
  }
  return deps.start;
}
