/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times, sortBy, random, sum } from 'lodash';
import indexTemplate from './template.json';
import { GeneratorFunction } from '../../types';

interface CreateValuesOptions {
  good: [number, number];
  bad: [number, number];
  ratio: number;
}

const createValues = (total: number, options: CreateValuesOptions) => {
  const totalBad = Math.floor(total * options.ratio);
  const totalGood = total - totalBad;
  const goodValues = times(totalGood, () => random(...options.good));
  const badValues = times(totalBad, () => random(...options.bad));
  return sortBy([...goodValues, ...badValues], (v) => v);
};

export const template = indexTemplate;

export const generateEvent: GeneratorFunction = (_config, _schedule, _index, timestamp) => {
  const values = createValues(100, {
    good: [100000, 200000],
    bad: [300000, 500000],
    ratio: 0.01,
  });
  return [
    {
      namespace: 'fake_apm_latency',
      '@timestamp': timestamp.toISOString(),
      service: {
        name: 'fake-test-app',
      },
      transaction: {
        name: 'GET /home',
        root: true,
        result: 'HTTP 2xx',
        type: 'request',
        duration: {
          histogram: {
            values,
            counts: values.map(() => 1),
          },
          summary: {
            sum: sum(values),
            value_count: values.length,
          },
        },
      },
    },
  ];
};
