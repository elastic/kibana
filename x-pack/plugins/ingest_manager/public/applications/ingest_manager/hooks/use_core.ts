/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { CoreStart } from 'kibana/public';

export const CoreContext = React.createContext<CoreStart | null>(null);

export function useCore() {
  const core = useContext(CoreContext);
  if (core === null) {
    throw new Error('CoreContext not initialized');
  }
  return core;
}
