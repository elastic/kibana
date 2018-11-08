/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('babel-register')({
  ignore: [
    // stolen from kibana/src/setup_node_env/babel_register/register.js
    // ignore paths matching `/node_modules/{a}/{b}`, unless `a`
    // is `x-pack` and `b` is not `node_modules`
    /\/node_modules\/(?!x-pack\/(?!node_modules)([^\/]+))([^\/]+\/[^\/]+)/,
  ],
  babelrc: false,
  presets: [require.resolve('@kbn/babel-preset/node_preset')],
});

require('./worker');
