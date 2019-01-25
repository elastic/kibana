/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { YamlConfigSchema } from './lib/types';

const filebeatInputConfig: YamlConfigSchema[] = [
  {
    id: 'paths',
    ui: {
      label: 'filebeatInputConfig.paths.ui.label',
      type: 'multi-input',
      helpText: 'filebeatInputConfig.paths.ui.helpText',
      placeholder: `first/path/to/file.json                   second/path/to/otherfile.json`,
    },
    validations: 'isPaths',
    error: 'filebeatInputConfig.paths.error',
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: 'filebeatInputConfig.other.ui.label',
      type: 'code',
      helpText: 'filebeatInputConfig.other.ui.helpText',
    },
    validations: 'isYaml',
    error: 'filebeatInputConfig.other.error',
  },
];

const filebeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      label: 'filebeatModuleConfig.module.ui.label',
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
    error: 'filebeatModuleConfig.module.error',
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: 'filebeatModuleConfig.other.ui.label',
      type: 'code',
      helpText: 'filebeatModuleConfig.other.ui.helpText',
    },
    validations: 'isYaml',
    error: 'filebeatModuleConfig.other.error',
  },
];

const metricbeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      label: 'metricbeatModuleConfig.module.ui.label',
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
    error: 'metricbeatModuleConfig.module.error',
    required: true,
  },
  {
    id: 'hosts',
    ui: {
      label: 'metricbeatModuleConfig.hosts.ui.label',
      type: 'multi-input',
      helpText: 'metricbeatModuleConfig.hosts.ui.helpText',
      placeholder: `somehost.local                                                             otherhost.local`,
    },
    validations: 'isHosts',
    error: 'metricbeatModuleConfig.hosts.error',
    required: false,
  },
  {
    id: 'period',
    ui: {
      label: 'metricbeatModuleConfig.period.ui.label',
      type: 'input',
    },
    defaultValue: '10s',
    validations: 'isPeriod',
    error: 'metricbeatModuleConfig.period.error',
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: 'metricbeatModuleConfig.other.ui.label',
      type: 'code',
      helpText: 'metricbeatModuleConfig.other.ui.helpText',
    },
    validations: 'isYaml',
    error: 'metricbeatModuleConfig.other.error',
  },
];

const outputConfig: YamlConfigSchema[] = [
  {
    id: 'output',
    ui: {
      label: 'outputConfig.output.ui.label',
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
        value: 'redis',
        text: 'Redis',
      },
    ],
    error: 'outputConfig.output.error',
    required: true,
  },
  {
    id: '{{output}}.hosts',
    ui: {
      label: 'outputConfig.hosts.ui.label',
      type: 'multi-input',
    },
    validations: 'isHosts',
    error: 'outputConfig.hosts.error',
    parseValidResult: v => v.split('\n'),
  },
  {
    id: '{{output}}.username',
    ui: {
      label: 'outputConfig.username.ui.label',
      type: 'input',
    },
    validations: 'isString',
    error: 'outputConfig.username.error',
  },
  {
    id: '{{output}}.password',
    ui: {
      label: 'outputConfig.password.ui.label',
      type: 'password',
    },
    validations: 'isString',
    error: 'outputConfig.password.error',
  },
];

export const supportedConfigs = [
  {
    text: 'supportedConfigs.filebeatInput.text',
    value: 'filebeat.inputs',
    config: filebeatInputConfig,
  },
  {
    text: 'supportedConfigs.filebeatModule.text',
    value: 'filebeat.modules',
    config: filebeatModuleConfig,
  },
  {
    text: 'supportedConfigs.metricbeatModule.text',
    value: 'metricbeat.modules',
    config: metricbeatModuleConfig,
  },
  { text: 'supportedConfigs.output.text', value: 'output', config: outputConfig },
];
