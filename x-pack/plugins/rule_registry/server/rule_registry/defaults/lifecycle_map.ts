/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const defaultAlertLifecycleMap = {
  status: {
    recovered: 'closed',
    active: 'open',
  },
  action: {
    new: 'open',
    recovered: 'close',
    active: 'active',
  },
} as const;

// export type DefaultAlertLifecycleMap = typeof defaultAlertLifecycleMap;
export interface DefaultAlertLifecycleMap {
  status: {
    recovered: string;
    active: string;
  };
  action: {
    new: string;
    recovered: string;
    active: string;
  };
}
