/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';

interface UMRefreshContext {
  lastRefresh: number;
}

const defaultContext: UMRefreshContext = {
  lastRefresh: 0,
};

export const UptimeRefreshContext = createContext(defaultContext);
