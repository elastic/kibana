/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// Note: importing this is a temp thing. This file will be replaced with JSON from Beats/ES at some point
import { ConfigBlockSchema } from './domain_types';

export const configBlockSchemas: ConfigBlockSchema[] = [
  {
    id: 'filebeat.inputs',
    name: 'Filebeat Input',
    version: 6.7,
    configs: [
      {
        id: 'paths',
        ui: {
          label: 'Paths',
          labelId: 'filebeatInputConfig.paths.ui.label',
          type: 'multi-input',
          helpText: 'filebeatInputConfig.paths.ui.helpText',
          helpTextId: 'filebeatInputConfig.paths.ui.helpText',
          placeholder: `first/path/to/file.json                   second/path/to/otherfile.json`,
        },
        validations: 'isPaths',
        error: 'filebeatInputConfig.paths.error',
        errorId: 'filebeatInputConfig.paths.error',
        required: true,
      },
      {
        id: 'other',
        ui: {
          label: 'filebeatInputConfig.other.ui.label',
          labelId: 'filebeatInputConfig.other.ui.label',
          type: 'code',
          helpText: 'filebeatInputConfig.other.ui.helpText',
          helpTextId: 'filebeatInputConfig.other.ui.helpText',
        },
        validations: 'isYaml',
        error: 'filebeatInputConfig.other.error',
        errorId: 'filebeatInputConfig.other.error',
      },
    ],
  },
  {
    id: 'filebeat.modules',
    name: 'Filebeat Modules',
    version: 6.7,
    configs: [
      {
        id: '_sub_type',
        ui: {
          label: 'filebeatModuleConfig.module.ui.label',
          labelId: 'filebeatModuleConfig.module.ui.label',
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
        errorId: 'filebeatModuleConfig.module.error',
        required: true,
      },
      {
        id: 'other',
        ui: {
          label: 'filebeatModuleConfig.other.ui.label',
          labelId: 'filebeatModuleConfig.other.ui.label',
          type: 'code',
          helpText: 'filebeatModuleConfig.other.ui.helpText',
        },
        validations: 'isYaml',
        error: 'filebeatModuleConfig.other.error',
        errorId: 'filebeatModuleConfig.other.error',
      },
    ],
  },
  {
    id: 'metricbeat.modules',
    name: 'Metricbeat Modules',
    version: 6.7,
    configs: [
      {
        id: '_sub_type',
        ui: {
          label: 'metricbeatModuleConfig.module.ui.label',
          labelId: 'metricbeatModuleConfig.module.ui.label',
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
        errorId: 'metricbeatModuleConfig.module.error',
        required: true,
      },
      {
        id: 'hosts',
        ui: {
          label: 'metricbeatModuleConfig.hosts.ui.label',
          labelId: 'metricbeatModuleConfig.hosts.ui.label',
          type: 'multi-input',
          helpText: 'metricbeatModuleConfig.hosts.ui.helpText',
          helpTextId: 'metricbeatModuleConfig.hosts.ui.helpText',
          placeholder: `somehost.local                                                             otherhost.local`,
        },
        validations: 'isHosts',
        error: 'metricbeatModuleConfig.hosts.error',
        errorId: 'metricbeatModuleConfig.hosts.error',
        required: false,
      },
      {
        id: 'period',
        ui: {
          label: 'metricbeatModuleConfig.period.ui.label',
          labelId: 'metricbeatModuleConfig.period.ui.label',
          type: 'input',
        },
        defaultValue: '10s',
        validations: 'isPeriod',
        error: 'metricbeatModuleConfig.period.error',
        errorId: 'metricbeatModuleConfig.period.error',
        required: true,
      },
      {
        id: 'other',
        ui: {
          label: 'metricbeatModuleConfig.other.ui.label',
          labelId: 'metricbeatModuleConfig.other.ui.label',
          type: 'code',
          helpText: 'metricbeatModuleConfig.other.ui.helpText',
          helpTextId: 'metricbeatModuleConfig.other.ui.helpText',
        },
        validations: 'isYaml',
        error: 'metricbeatModuleConfig.other.error',
        errorId: 'metricbeatModuleConfig.other.error',
      },
    ],
  },
  {
    id: 'output',
    name: 'Outputs',
    version: 6.7,
    configs: [
      {
        id: '_sub_type',
        ui: {
          label: 'outputConfig.output.ui.label',
          labelId: 'outputConfig.output.ui.label',
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
        errorId: 'outputConfig.output.error',
        required: true,
      },
      {
        id: 'hosts',
        ui: {
          label: 'outputConfig.hosts.ui.label',
          labelId: 'outputConfig.hosts.ui.label',
          type: 'multi-input',
        },
        validations: 'isHosts',
        error: 'outputConfig.hosts.error',
        errorId: 'outputConfig.hosts.error',
        parseValidResult: v => v.split('\n'),
      },
      {
        id: 'username',
        ui: {
          label: 'outputConfig.username.ui.label',
          labelId: 'outputConfig.username.ui.label',
          type: 'input',
        },
        validations: 'isString',
        error: 'outputConfig.username.error',
        errorId: 'outputConfig.username.error',
      },
      {
        id: 'password',
        ui: {
          label: 'outputConfig.password.ui.label',
          labelId: 'outputConfig.password.ui.label',
          type: 'password',
        },
        validations: 'isString',
        error: 'outputConfig.password.error',
        errorId: 'outputConfig.password.error',
      },
    ],
  },
];
