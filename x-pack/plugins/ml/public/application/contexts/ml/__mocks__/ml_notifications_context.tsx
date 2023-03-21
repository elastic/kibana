/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const useMlNotifications = jest.fn(() => {
  return {
    lastCheckedAt: undefined,
    setLastCheckedAt: jest.fn(),
    notificationsCounts: { info: 0, error: 0, warning: 0 },
    latestRequestedAt: null,
  };
});
