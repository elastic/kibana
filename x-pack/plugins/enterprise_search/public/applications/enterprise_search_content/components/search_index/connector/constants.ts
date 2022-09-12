/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NativeConnector } from './types';

export const NATIVE_CONNECTORS: NativeConnector[] = [
  {
    configuration: {
      host: {
        value: '',
        label: 'MongoDB Host',
      },
      user: {
        value: '',
        label: 'MongoDB Username',
      },
      password: {
        value: '',
        label: 'MongoDB Password',
      },
      database: {
        value: '',
        label: 'MongoDB Database',
      },
      collection: {
        value: '',
        label: 'MongoDB Collection',
      },
    },
    name: 'MongoDB',
    serviceType: 'mongodb',
  },
  {
    configuration: {
      host: {
        value: '',
        label: 'MySQL Host',
      },
      port: {
        value: '',
        label: 'MySQL Port',
      },
      user: {
        value: '',
        label: 'MySQL Username',
      },
      password: {
        value: '',
        label: 'MySQL Password',
      },
      database: {
        value: '',
        label: 'List of MySQL Databases',
      },
    },
    name: 'MySQL',
    serviceType: 'mysql',
  },
];
