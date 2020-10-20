/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface MockLastEventTimeQuery {
  lastSeen: string | null;
  errorMessage: string | null;
}

const getTimeTwelveMinutesAgo = () => {
  const d = new Date();
  const ts = d.getTime();
  const twelveMinutes = ts - 12 * 60 * 1000;
  return new Date(twelveMinutes).toISOString();
};

export const mockLastEventTimeQuery: MockLastEventTimeQuery = {
  lastSeen: getTimeTwelveMinutesAgo(),
  errorMessage: null,
};
