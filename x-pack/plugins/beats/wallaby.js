/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

module.exports = function (wallaby) {
  return {
    debug: true,
    files: [
      '../../tsconfig.json',
      //'plugins/beats/public/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
      'server/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
      'common/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
    ],

    tests: ['**/*.test.ts'],
    env: {
      type: 'node',
      runner: 'node',
    },
    testFramework: 'jest',
    compilers: {
      '**/*.ts?(x)': wallaby.compilers.typeScript({ module: 'commonjs' }),
    },
  };
};
