/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThresholdSignalHistory } from '../types';
import { getThresholdTermsHash } from '../utils';

export const sampleThresholdSignalHistory = (): ThresholdSignalHistory => {
  const terms = [
    {
      field: 'source.ip',
      value: '127.0.0.1',
    },
    {
      field: 'host.name',
      value: 'garden-gnomes',
    },
  ];
  return {
    [`${getThresholdTermsHash(terms)}`]: {
      terms,
      lastSignalTimestamp: new Date('2020-12-17T16:28:00Z').getTime(),
    },
  };
};
