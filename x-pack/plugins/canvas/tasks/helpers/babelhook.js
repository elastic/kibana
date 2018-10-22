/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { resolve } = require('path');
const register = require('babel-register');

const options = {
  sourceMaps: false,
  plugins: [
    [
      'mock-imports',
      [
        {
          pattern: 'scriptjs',
          location: resolve(__dirname, '..', 'mocks', 'noop'),
        },
        {
          pattern: 'ui/chrome',
          location: resolve(__dirname, '..', 'mocks', 'uiChrome'),
        },
        {
          pattern: 'ui/notify',
          location: resolve(__dirname, '..', 'mocks', 'uiNotify'),
        },
        {
          pattern: 'ui/url/absolute_to_parsed_url',
          location: resolve(__dirname, '..', 'mocks', 'absoluteToParsedUrl'),
        },
        {
          pattern: 'socket.io-client',
          location: resolve(__dirname, '..', 'mocks', 'socketClient'),
        },
        {
          // ugly hack so that importing non-js files works, required for the function docs
          pattern: '.(less|png|svg)$',
          location: resolve(__dirname, '..', 'mocks', 'noop'),
        },
        {
          pattern: 'plugins/canvas/apps',
          location: resolve(__dirname, '..', 'mocks', 'noop'),
        },
        {
          pattern: '/state/store',
          location: resolve(__dirname, '..', 'mocks', 'stateStore'),
        },
      ],
    ],
  ],
};

register(options);
