/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import type { FleetConfigType } from '../plugin';

export const ConfigContext = React.createContext<FleetConfigType | null>(null);

export function useConfig(): FleetConfigType | null {
  const config = useContext(ConfigContext);
  if (config === null) {
    // eslint-disable-next-line no-console
    console.error('Fleet ConfigContext not initialized');
  }
  return config;
}
