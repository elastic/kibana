/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('babel-register')({
  compact: false,
  minified: false,
  ignore: [
    // stolen from kibana/src/setup_node_env/babel_register/register.js
    // ignore paths matching `/node_modules/{a}/{b}`, unless `a`
    // is `x-pack` and `b` is not `node_modules`
    /\/node_modules\/(?!x-pack\/(?!node_modules)([^\/]+))([^\/]+\/[^\/]+)/,
  ],
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

        // replaces `import "babel-polyfill"` with a list of require statements
        // for just the polyfills that the target versions don't already supply
        // on their own
        useBuiltIns: true,
      },
    ],
  ],
  babelrc: false,
});

require('./worker');
