/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import type { FleetConfigType } from '../../../plugin';

export const ConfigContext = React.createContext<FleetConfigType | null>(null);

export function useConfig() {
  const config = useContext(ConfigContext);
  if (config === null) {
    throw new Error('ConfigContext not initialized');
  }
  return config;
}
