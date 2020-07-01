/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable import/no-extraneous-dependencies */

const execa = require('execa');
const { filesToIgnore } = require('./paths');

module.exports = {
  deoptimizeTsConfig: async () => {
    for (const filename of filesToIgnore) {
      await execa('git', ['update-index', '--no-skip-worktree', filename]);
      await execa('git', ['checkout', filename]);
    }
  },
};
