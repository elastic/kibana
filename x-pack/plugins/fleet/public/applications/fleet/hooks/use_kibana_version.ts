/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

export const KibanaVersionContext = React.createContext<string | null>(null);

export function useKibanaVersion() {
  const version = useContext(KibanaVersionContext);
  if (version === null) {
    throw new Error('KibanaVersionContext is not initialized');
  }
  return version;
}
