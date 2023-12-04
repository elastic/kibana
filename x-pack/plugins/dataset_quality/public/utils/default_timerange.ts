/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ONE_DAY_IN_MILLISECONDS = 24 * 3600000;

export const getDefaultTimeRange = () => {
  const now = Date.now();

  return {
    from: new Date(now - ONE_DAY_IN_MILLISECONDS).toISOString(),
    to: new Date(now).toISOString(),
  };
};
