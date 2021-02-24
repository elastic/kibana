/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-extraneous-dependencies */

const execa = require('execa');

const { filesToIgnore } = require('./paths');

async function unoptimizeTsConfig() {
  for (const filename of filesToIgnore) {
    await execa('git', ['update-index', '--no-skip-worktree', filename]);
    await execa('git', ['checkout', filename]);
  }
}

module.exports = {
  unoptimizeTsConfig: async () => {
    await unoptimizeTsConfig();
    // eslint-disable-next-line no-console
    console.log('Removed APM TypeScript optimizations');
  },
};
