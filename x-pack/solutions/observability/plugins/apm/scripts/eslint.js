/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

//eslint-disable-next-line import/no-extraneous-dependencies
const { ESLint } = require('eslint');
const { resolve } = require('path');
//eslint-disable-next-line import/no-extraneous-dependencies
const { argv } = require('yargs');

async function run() {
  const fix = !!argv.fix;

  const eslint = new ESLint({
    fix,
    cache: true,
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  });

  const report = await eslint.lintFiles(resolve(__dirname, '..'));

  const formatter = await eslint.loadFormatter();

  return formatter(report.results);
}

run()
  .then((text) => {
    //eslint-disable-next-line no-console
    console.log(text);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
