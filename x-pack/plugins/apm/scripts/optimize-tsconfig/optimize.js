/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const json5 = require('json5');
const execa = require('execa');
const { omit } = require('lodash');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const {
  xpackRoot,
  kibanaRoot,
  tsconfigTpl,
  filesToIgnore,
} = require('./paths');
const { unoptimizeTsConfig } = require('./unoptimize');

function prepareParentTsConfigs() {
  return Promise.all(
    [
      path.resolve(xpackRoot, 'tsconfig.json'),
      path.resolve(kibanaRoot, 'tsconfig.base.json'),
      path.resolve(kibanaRoot, 'tsconfig.json'),
    ].map(async (filename) => {
      const config = json5.parse(await readFile(filename, 'utf-8'));

      await writeFile(
        filename,
        JSON.stringify(
          {
            ...omit(config, 'references'),
            compilerOptions: {
              ...config.compilerOptions,
              incremental: false,
            },
            include: [],
          },
          null,
          2
        ),
        { encoding: 'utf-8' }
      );
    })
  );
}

async function addApmFilesToXpackTsConfig() {
  const template = json5.parse(await readFile(tsconfigTpl, 'utf-8'));
  const xpackTsConfig = path.join(xpackRoot, 'tsconfig.json');
  const config = json5.parse(await readFile(xpackTsConfig, 'utf-8'));

  await writeFile(
    xpackTsConfig,
    JSON.stringify({ ...config, ...template }, null, 2),
    { encoding: 'utf-8' }
  );
}

async function setIgnoreChanges() {
  for (const filename of filesToIgnore) {
    await execa('git', ['update-index', '--skip-worktree', filename]);
  }
}

async function optimizeTsConfig() {
  await unoptimizeTsConfig();

  await prepareParentTsConfigs();

  await addApmFilesToXpackTsConfig();

  await setIgnoreChanges();
  // eslint-disable-next-line no-console
  console.log(
    'Created an optimized tsconfig.json for APM. To undo these changes, run `./scripts/unoptimize-tsconfig.js`'
  );
}

module.exports = {
  optimizeTsConfig,
};
