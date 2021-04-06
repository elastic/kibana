/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
const unlink = promisify(fs.unlink);

const { kibanaRoot, tsconfigTpl, filesToIgnore } = require('./paths');
const { unoptimizeTsConfig } = require('./unoptimize');

async function prepareBaseTsConfig() {
  const baseConfigFilename = path.resolve(kibanaRoot, 'tsconfig.base.json');
  const config = json5.parse(await readFile(baseConfigFilename, 'utf-8'));

  await writeFile(
    baseConfigFilename,
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
}

async function addApmFilesToRootTsConfig() {
  const template = json5.parse(await readFile(tsconfigTpl, 'utf-8'));
  const rootTsConfigFilename = path.join(kibanaRoot, 'tsconfig.json');
  const rootTsConfig = json5.parse(
    await readFile(rootTsConfigFilename, 'utf-8')
  );

  await writeFile(
    rootTsConfigFilename,
    JSON.stringify({ ...rootTsConfig, ...template, references: [] }, null, 2),
    { encoding: 'utf-8' }
  );
}

async function setIgnoreChanges() {
  for (const filename of filesToIgnore) {
    await execa('git', ['update-index', '--skip-worktree', filename]);
  }
}

async function deleteApmTsConfig() {
  await unlink(path.resolve(kibanaRoot, 'x-pack/plugins/apm', 'tsconfig.json'));
}

async function optimizeTsConfig() {
  await unoptimizeTsConfig();

  await prepareBaseTsConfig();

  await addApmFilesToRootTsConfig();

  await deleteApmTsConfig();

  await setIgnoreChanges();
  // eslint-disable-next-line no-console
  console.log(
    'Created an optimized tsconfig.json for APM. To undo these changes, run `./scripts/unoptimize-tsconfig.js`'
  );
}

module.exports = {
  optimizeTsConfig,
};
