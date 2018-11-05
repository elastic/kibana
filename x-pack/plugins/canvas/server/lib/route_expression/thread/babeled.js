/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('babel-register')({
  plugins: [
    'transform-object-rest-spread',
    'transform-async-to-generator',
    'transform-class-properties',
  ],
  presets: [
    'react',
    [
      'env',
      {
        targets: {
          node: 'current',
        },
        // useBuiltIns: 'usage',
      },
    ],
  ],
  babelrc: false,
});
require('./worker');
