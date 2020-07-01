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

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const { xpackRoot, kibanaRoot, tsconfigTpl, filesToIgnore } = require('./paths');
const { deoptimizeTsConfig } = require('./deoptimize');

function prepareParentTsConfigs() {
  return Promise.all(
    [path.resolve(xpackRoot, 'tsconfig.json'), path.resolve(kibanaRoot, 'tsconfig.json')].map(
      async (filename) => {
        const config = json5.parse(await readFile(filename, 'utf-8'));

        let content = '// THIS CONFIGURATION HAS BEEN OPTIMIZED FOR CANVAS DEVELOPMENT.\n';
        content += '// These optimizations can be reversed:\n';
        content += '//    [/x-pack/plugins/canvas] node scripts/optimize_tsconfig --revert\n';
        content += '//\n';
        content += '// See: /x-pack/plugins/canvas/scripts/optimize_tsconfig for details\n\n';
        content += JSON.stringify(
          {
            ...config,
            include: [],
          },
          null,
          2
        );

        await writeFile(filename, content, { encoding: 'utf-8' });
      }
    )
  );
}

async function addFilesToXpackTsConfig() {
  const template = json5.parse(await readFile(tsconfigTpl, 'utf-8'));
  const xpackTsConfig = path.join(xpackRoot, 'tsconfig.json');
  const config = json5.parse(await readFile(xpackTsConfig, 'utf-8'));

  await writeFile(xpackTsConfig, JSON.stringify({ ...config, ...template }, null, 2), {
    encoding: 'utf-8',
  });
}

async function setIgnoreChanges() {
  for (const filename of filesToIgnore) {
    await execa('git', ['update-index', '--skip-worktree', filename]);
  }
}

async function optimizeTsConfig() {
  await deoptimizeTsConfig();
  await prepareParentTsConfigs();
  await addFilesToXpackTsConfig();
  await setIgnoreChanges();
}

module.exports = {
  optimizeTsConfig,
};
