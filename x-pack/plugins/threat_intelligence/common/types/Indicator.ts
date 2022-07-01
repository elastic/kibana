/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Indicator {
  value: string;
  type: string;
  feed: string;
  first_seen: string;
}

export const generateMockIndicator = (): Indicator => ({
  value: '12.68.554.87',
  type: 'IP',
  feed: 'Abuse_CH',
  first_seen: '2022-01-01T01:01:01.000Z',
});
