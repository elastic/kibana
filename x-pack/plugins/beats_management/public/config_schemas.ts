/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { YamlConfigSchema } from './lib/lib';

const filebeatInputConfig: YamlConfigSchema[] = [
  {
    id: 'paths',
    ui: {
      label: 'Paths',
      type: 'multi-input',
    },
    validations: 'isPaths',
    error: 'One file path per line',
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: 'Other Config',
      type: 'code',
    },
    validations: 'isYaml',
    error: 'Config entered must be in valid YAML format',
  },
];

const filebeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      label: 'Module',
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
  {
    id: 'other',
    ui: {
      label: 'Other Config',
      type: 'code',
    },
    validations: 'isYaml',
    error: 'Config entered must be in valid YAML format',
  },
];

const metricbeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      label: 'Module',
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
      label: 'Hosts',
      type: 'multi-input',
    },
    validations: 'isHosts',
    error: 'One file host per line',
    required: false,
  },
  {
    id: 'period',
    ui: {
      label: 'Period',
      type: 'input',
    },
    defaultValue: '10s',
    validations: 'isPeriod',
    error: 'Invalid Period, must be formatted as `10s` for 10 seconds',
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: 'Other Config',
      type: 'code',
    },
    validations: 'isYaml',
    error: 'Config entered must be in valid YAML format',
  },
];

const outputConfig: YamlConfigSchema[] = [
  {
    id: 'output',
    ui: {
      label: 'Output Type',
      type: 'select',
    },
    options: [
      {
        value: 'elasticsearch',
        text: 'Elasticsearch',
      },
      {
        value: 'logstash',
        text: 'Logstash',
      },
      {
        value: 'kafka',
        text: 'Kafka',
      },
      {
        value: 'console',
        text: 'Console',
      },
    ],
    error: 'Please select an output type',
    required: true,
  },
  {
    id: 'hosts',
    ui: {
      label: 'Hosts',
      type: 'multi-input',
    },
    validations: 'isHost',
    error: 'One file host per line',
    parseValidResult: v => v.split('\n'),
  },
  {
    id: 'username',
    ui: {
      label: 'Username',
      type: 'input',
    },
    validations: 'isString',
    error: 'Unprocessable username',
  },
  {
    id: 'password',
    ui: {
      label: 'Password',
      type: 'input',
    },
    validations: 'isString',
    error: 'Unprocessable password',
  },
];

export const supportedConfigs = [
  { text: 'Filebeat Input', value: 'filebeat.inputs', config: filebeatInputConfig },
  { text: 'Filebeat Module', value: 'filebeat.modules', config: filebeatModuleConfig },
  { text: 'Metricbeat Input', value: 'metricbeat.modules', config: metricbeatModuleConfig },
  { text: 'Output', value: 'output', config: outputConfig },
];
