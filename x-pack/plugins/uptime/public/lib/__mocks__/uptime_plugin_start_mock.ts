/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface InputTimeRange {
  from: string;
  to: string;
}

export const startPlugins = {
  data: {
    query: {
      timefilter: {
        timefilter: {
          getTime: () => ({ to: 'now-15m', from: 'now-30m' }),
          setTime: jest.fn(({ from, to }: InputTimeRange) => {}),
        },
      },
    },
  },
};
