/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { YamlConfigSchema } from './lib/lib';

const filebeatInputConfig: YamlConfigSchema[] = [
  {
    id: 'paths',
    ui: {
      label: i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsLabel', {
        defaultMessage: 'Paths',
      }),
      type: 'multi-input',
      helpText: i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsDescription', {
        defaultMessage: 'Put each of the paths on a separate line',
      }),
      placeholder: `first/path/to/file.json                   second/path/to/otherfile.json`,
    },
    validations: 'isPaths',
    error: i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsErrorMessage', {
      defaultMessage: 'One file path per line',
    }),
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigLabel', {
        defaultMessage: 'Other Config',
      }),
      type: 'code',
      helpText: i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigDescription', {
        defaultMessage: 'Use YAML format to specify other settings for the Filebeat Input',
      }),
    },
    validations: 'isYaml',
    error: i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  },
];

const filebeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      label: i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleLabel', {
        defaultMessage: 'Module',
      }),
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
    error: i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleErrorMessage', {
      defaultMessage: 'Please select a module',
    }),
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigLabel', {
        defaultMessage: 'Other Config',
      }),
      type: 'code',
      helpText: i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleDescription', {
        defaultMessage: 'Use YAML format to specify other settings for the Filebeat Module',
      }),
    },
    validations: 'isYaml',
    error: i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  },
];

const metricbeatModuleConfig: YamlConfigSchema[] = [
  {
    id: 'module',
    ui: {
      label: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleLabel', {
        defaultMessage: 'Module',
      }),
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
    error: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleErrorMessage', {
      defaultMessage: 'Please select a module',
    }),
    required: true,
  },
  {
    id: 'hosts',
    ui: {
      label: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsLabel', {
        defaultMessage: 'Hosts',
      }),
      type: 'multi-input',
      helpText: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsDescription', {
        defaultMessage: 'Put each of the paths on a seperate line',
      }),
      placeholder: `somehost.local                                                             otherhost.local`,
    },
    validations: 'isHosts',
    error: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsErrorMessage', {
      defaultMessage: 'One file host per line',
    }),
    required: false,
  },
  {
    id: 'period',
    ui: {
      label: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodLabel', {
        defaultMessage: 'Period',
      }),
      type: 'input',
    },
    defaultValue: '10s',
    validations: 'isPeriod',
    error: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodErrorMessage', {
      defaultMessage: 'Invalid Period, must be formatted as `10s` for 10 seconds',
    }),
    required: true,
  },
  {
    id: 'other',
    ui: {
      label: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigLabel', {
        defaultMessage: 'Other Config',
      }),
      type: 'code',
      helpText: i18n.translate(
        'xpack.beatsManagement.metricbeatModuleConfig.otherConfigDescription',
        {
          defaultMessage: 'Use YAML format to specify other settings for the Metricbeat Module',
        }
      ),
    },
    validations: 'isYaml',
    error: i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  },
];

const outputConfig: YamlConfigSchema[] = [
  {
    id: 'output',
    ui: {
      label: i18n.translate('xpack.beatsManagement.outputConfig.outputTypeLabel', {
        defaultMessage: 'Output Type',
      }),
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
    error: i18n.translate('xpack.beatsManagement.outputConfig.outputTypeErrorMessage', {
      defaultMessage: 'Please select an output type',
    }),
    required: true,
  },
  {
    id: '{{output}}.hosts',
    ui: {
      label: i18n.translate('xpack.beatsManagement.outputConfig.hostsLabel', {
        defaultMessage: 'Hosts',
      }),
      type: 'multi-input',
    },
    validations: 'isHosts',
    error: i18n.translate('xpack.beatsManagement.outputConfig.hostsErrorMessage', {
      defaultMessage: 'One file host per line',
    }),
    parseValidResult: v => v.split('\n'),
  },
  {
    id: '{{output}}.username',
    ui: {
      label: i18n.translate('xpack.beatsManagement.outputConfig.usernameLabel', {
        defaultMessage: 'Username',
      }),
      type: 'input',
    },
    validations: 'isString',
    error: i18n.translate('xpack.beatsManagement.outputConfig.usernameErrorMessage', {
      defaultMessage: 'Unprocessable username',
    }),
  },
  {
    id: '{{output}}.password',
    ui: {
      label: i18n.translate('xpack.beatsManagement.outputConfig.passwordLabel', {
        defaultMessage: 'Password',
      }),
      type: 'password',
    },
    validations: 'isString',
    error: i18n.translate('xpack.beatsManagement.outputConfig.passwordErrorMessage', {
      defaultMessage: 'Unprocessable password',
    }),
  },
];

export const supportedConfigs = [
  {
    text: i18n.translate('xpack.beatsManagement.tagConfig.filebeatInputLabel', {
      defaultMessage: 'Filebeat Input',
    }),
    value: 'filebeat.inputs',
    config: filebeatInputConfig,
  },
  {
    text: i18n.translate('xpack.beatsManagement.tagConfig.filebeatModuleLabel', {
      defaultMessage: 'Filebeat Module',
    }),
    value: 'filebeat.modules',
    config: filebeatModuleConfig,
  },
  {
    text: i18n.translate('xpack.beatsManagement.tagConfig.metricbeatModuleLabel', {
      defaultMessage: 'Metricbeat Module',
    }),
    value: 'metricbeat.modules',
    config: metricbeatModuleConfig,
  },
  {
    text: i18n.translate('xpack.beatsManagement.tagConfig.outputLabel', {
      defaultMessage: 'Output',
    }),
    value: 'output',
    config: outputConfig,
  },
];
