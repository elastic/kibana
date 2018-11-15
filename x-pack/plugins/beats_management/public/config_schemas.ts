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
      helpText: 'Put each of the paths on a seperate line',
      placeholder: `first/path/to/file.json                   second/path/to/otherfile.json`,
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
      helpText: 'Use YAML format to specify other settings for the Filebeat Input',
    },
    validations: 'isYaml',
    error: 'Use valid YAML format',
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
        value: 'apache2',
        text: 'apache2',
      },
      {
        value: 'auditd',
        text: 'auditd',
      },
      {
        value: 'elasticsearch',
        text: 'elasticsearch',
      },
      {
        value: 'haproxy',
        text: 'haproxy',
      },
      {
        value: 'icinga',
        text: 'icinga',
      },
      {
        value: 'iis',
        text: 'iis',
      },
      {
        value: 'kafka',
        text: 'kafka',
      },
      {
        value: 'kibana',
        text: 'kibana',
      },
      {
        value: 'logstash',
        text: 'logstash',
      },
      {
        value: 'mongodb',
        text: 'mongodb',
      },
      {
        value: 'mysql',
        text: 'mysql',
      },
      {
        value: 'nginx',
        text: 'nginx',
      },
      {
        value: 'osquery',
        text: 'osquery',
      },
      {
        value: 'postgresql',
        text: 'postgresql',
      },
      {
        value: 'redis',
        text: 'redis',
      },
      {
        value: 'system',
        text: 'system',
      },
      {
        value: 'traefik',
        text: 'traefik',
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
      helpText: 'Use YAML format to specify other settings for the Filebeat Module',
    },
    validations: 'isYaml',
    error: 'Use valid YAML format',
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
        value: 'aerospike',
        text: 'aerospike',
      },
      {
        value: 'apache',
        text: 'apache',
      },
      {
        value: 'ceph',
        text: 'ceph',
      },
      {
        value: 'couchbase',
        text: 'couchbase',
      },
      {
        value: 'docker',
        text: 'docker',
      },
      {
        value: 'dropwizard',
        text: 'dropwizard',
      },
      {
        value: 'elasticsearch',
        text: 'elasticsearch',
      },
      {
        value: 'envoyproxy',
        text: 'envoyproxy',
      },
      {
        value: 'etcd',
        text: 'etcd',
      },
      {
        value: 'golang',
        text: 'golang',
      },
      {
        value: 'graphite',
        text: 'graphite',
      },
      {
        value: 'haproxy',
        text: 'haproxy',
      },
      {
        value: 'http',
        text: 'http',
      },
      {
        value: 'jolokia',
        text: 'jolokia',
      },
      {
        value: 'kafka',
        text: 'kafka',
      },
      {
        value: 'kibana',
        text: 'kibana',
      },
      {
        value: 'kubernetes',
        text: 'kubernetes',
      },
      {
        value: 'kvm',
        text: 'kvm',
      },
      {
        value: 'logstash',
        text: 'logstash',
      },
      {
        value: 'memcached',
        text: 'memcached',
      },
      {
        value: 'mongodb',
        text: 'mongodb',
      },
      {
        value: 'munin',
        text: 'munin',
      },
      {
        value: 'mysql',
        text: 'mysql',
      },
      {
        value: 'nginx',
        text: 'nginx',
      },
      {
        value: 'php_fpm',
        text: 'php_fpm',
      },
      {
        value: 'postgresql',
        text: 'postgresql',
      },
      {
        value: 'prometheus',
        text: 'prometheus',
      },
      {
        value: 'rabbitmq',
        text: 'rabbitmq',
      },
      {
        value: 'redis',
        text: 'redis',
      },
      {
        value: 'system',
        text: 'system',
      },
      {
        value: 'traefik',
        text: 'traefik',
      },
      {
        value: 'uwsgi',
        text: 'uwsgi',
      },
      {
        value: 'vsphere',
        text: 'vsphere',
      },
      {
        value: 'windows',
        text: 'windows',
      },
      {
        value: 'zookeeper',
        text: 'zookeeper',
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
      helpText: 'Put each of the paths on a seperate line',
      placeholder: `somehost.local                                                             otherhost.local`,
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
      helpText: 'Use YAML format to specify other settings for the Metricbeat Module',
    },
    validations: 'isYaml',
    error: 'Use valid YAML format',
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
    id: '{{output}}.hosts',
    ui: {
      label: 'Hosts',
      type: 'multi-input',
    },
    validations: 'isHosts',
    error: 'One file host per line',
    parseValidResult: v => v.split('\n'),
  },
  {
    id: '{{output}}.username',
    ui: {
      label: 'Username',
      type: 'input',
    },
    validations: 'isString',
    error: 'Unprocessable username',
  },
  {
    id: '{{output}}.password',
    ui: {
      label: 'Password',
      type: 'password',
    },
    validations: 'isString',
    error: 'Unprocessable password',
  },
];

export const supportedConfigs = [
  { text: 'Filebeat Input', value: 'filebeat.inputs', config: filebeatInputConfig },
  { text: 'Filebeat Module', value: 'filebeat.modules', config: filebeatModuleConfig },
  { text: 'Metricbeat Module', value: 'metricbeat.modules', config: metricbeatModuleConfig },
  { text: 'Output', value: 'output', config: outputConfig },
];
