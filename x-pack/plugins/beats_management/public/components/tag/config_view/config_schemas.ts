/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { YamlConfigSchema } from '../../../lib/lib';

export const filebeatInputConfig: YamlConfigSchema[] = [
  {
    id: 'paths',
    ui: {
      name: 'Paths',
      type: 'multi-input',
    },
    validations: 'isPaths',
    error: 'One file path per line',
    required: true,
    parseValidResult: v => v.split('\n'),
  },
];

export const filebeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      name: 'Module',
      type: 'select',
    },
    options: [
      {
        value: 'system',
        text: 'system',
      },
      {
        value: 'apache2',
        text: 'apache2',
      },
      {
        value: 'nginx',
        text: 'nginx',
      },
      {
        value: 'mongodb',
        text: 'mongodb',
      },
      {
        value: 'elasticsearch',
        text: 'elasticsearch',
      },
    ],
    error: 'Please select a module',
    required: true,
  },
];

export const metricbeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      name: 'Module',
      type: 'select',
    },
    options: [
      {
        value: 'system',
        text: 'system',
      },
      {
        value: 'apache2',
        text: 'apache2',
      },
      {
        value: 'nginx',
        text: 'nginx',
      },
      {
        value: 'mongodb',
        text: 'mongodb',
      },
    ],
    error: 'Please select a module',
    required: true,
  },
  {
    id: 'hosts',
    ui: {
      name: 'Hosts',
      type: 'multi-input',
    },
    validations: 'isHost',
    error: 'One file host per line',
    required: true,
    parseValidResult: v => v.split('\n'),
  },
  {
    id: 'period',
    ui: {
      name: 'Period',
      type: 'multi-input',
    },
    defaultValue: '10s',
    validations: 'isPeriod',
    error: 'Invalid Period, must be formatted as `10s` for 10 seconds',
    required: true,
    parseValidResult: v => v.split('\n'),
  },
];
