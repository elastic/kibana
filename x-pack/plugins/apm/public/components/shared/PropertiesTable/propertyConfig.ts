/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PROPERTY_CONFIG = [
  {
    key: 'request',
    required: false,
    presortedKeys: [
      'http_version',
      'method',
      'url',
      'socket',
      'headers',
      'body'
    ]
  },
  {
    key: 'response',
    required: false,
    presortedKeys: ['status_code', 'headers', 'headers_sent', 'finished']
  },
  {
    key: 'system',
    required: false,
    presortedKeys: ['hostname', 'architecture', 'platform']
  },
  {
    key: 'service',
    required: false,
    presortedKeys: ['runtime', 'framework', 'agent', 'version']
  },
  {
    key: 'process',
    required: false,
    presortedKeys: ['pid', 'title', 'argv']
  },
  {
    key: 'user',
    required: true,
    presortedKeys: ['id', 'username', 'email']
  },
  {
    key: 'tags',
    required: true,
    presortedKeys: []
  },
  {
    key: 'custom',
    required: true,
    presortedKeys: []
  }
];
