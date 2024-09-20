/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SystemLogsStream {
  id: string;
  data_stream: {
    dataset: string;
    type: string;
  };
  paths: string[];
  exclude_files: string[];
  multiline: {
    pattern: string;
    match: string;
  };
  tags?: string[];
  processors: Array<{
    add_locale: string | null;
  }>;
}

export const generateSystemLogsYml = ({
  namespace = 'default',
  apiKey,
  esHost,
  uuid,
}: {
  namespace?: string;
  apiKey: string;
  esHost: string[];
  uuid: string;
}) => {
  return dump({
    outputs: {
      default: {
        type: 'elasticsearch',
        hosts: esHost,
        api_key: apiKey,
      },
    },
    inputs: getSystemLogsInputs(uuid, namespace),
  });
};

export const getSystemLogsInputs = (uuid: string, namespace: string = 'default') => {
  return [
    {
      id: `system-logs-${uuid}`,
      type: 'logfile',
      data_stream: {
        namespace,
      },
      streams: getSystemLogsDataStreams(uuid),
    },
  ];
};

/*
 * Utils
 */
export const getSystemLogsDataStreams = (uuid: string = ''): SystemLogsStream[] => [
  {
    id: `logfile-system.auth-${uuid}`,
    data_stream: {
      dataset: 'system.auth',
      type: 'logs',
    },
    paths: ['/var/log/auth.log*', '/var/log/secure*'],
    exclude_files: ['.gz$'],
    multiline: {
      pattern: '^s',
      match: 'after',
    },
    tags: ['system-auth'],
    processors: [
      {
        add_locale: null,
      },
    ],
  },
  {
    id: `logfile-system.syslog-${uuid}`,
    data_stream: {
      dataset: 'system.syslog',
      type: 'logs',
    },
    paths: ['/var/log/messages*', '/var/log/syslog*', '/var/log/system*'],
    exclude_files: ['.gz$'],
    multiline: {
      pattern: '^s',
      match: 'after',
    },
    processors: [
      {
        add_locale: null,
      },
    ],
  },
];
