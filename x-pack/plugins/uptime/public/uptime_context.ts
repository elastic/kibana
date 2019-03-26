/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';

interface UMContext {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  // colors: UptimeAppColors;
}

const defaultContext: UMContext = {
  autorefreshIsPaused: true,
  autorefreshInterval: 10000,
  dateRangeStart: 'now-15m',
  dateRangeEnd: 'now',
  // colors: {
  //   danger: 'test',
  //   primary: 'teawt',
  //   secondary: 'few',
  // },
};

export const UptimeContext = createContext(defaultContext);
