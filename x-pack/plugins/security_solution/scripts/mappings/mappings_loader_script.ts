/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { execSync } from 'child_process';

const CONFIG_PATH = '../../../test/functional/config.base.js';

const loadAllIndices = (esUrl: string, kibanaUrl: string, mappingsDir: string) => {
  const exec = (cmd: string) => execSync(cmd, { stdio: 'inherit' });

  const absoluteMappingsDir = path.resolve(mappingsDir);
  if (!fs.existsSync(absoluteMappingsDir)) {
    console.warn(`Root directory "${absoluteMappingsDir}" does not exist.`);
    return;
  }

  fs.readdir(absoluteMappingsDir, (err, files) => {
    if (err) {
      throw new Error(`Could not list the directory because of error: ${JSON.stringify(err)}`);
    }

    files.forEach((file) => {
      // Make one pass and make the file complete
      const fullPath = path.join(absoluteMappingsDir, file);

      fs.stat(fullPath, (error, stat) => {
        if (error) {
          console.error(`Error stating file: ${error}`);
          return;
        }
        if (!stat.isDirectory()) {
          return;
        }
        exec(
          `node ../../../scripts/es_archiver load ${fullPath} --config "${CONFIG_PATH}" --es-url=${esUrl} --kibana-url=${kibanaUrl}`
        );
      });
    });
  });
};

const main = () => {
  const { argv } = yargs(process.argv.slice(2))
    .option('es-url', {
      demandOption: false,
      type: 'string',
      default: 'http://elastic:changeme@localhost:9200',
      description: 'The url for Elasticsearch',
    })
    .option('kibana-url', {
      demandOption: false,
      type: 'string',
      default: 'http://elastic:changeme@localhost:5601/app',
      description: 'The url for Kibana',
    })
    .option('mappings-dir', {
      demandOption: true,
      type: 'string',
      description: 'The name of the directory with all the mapping folders',
    })
    .help();

  const { 'es-url': esUrl, 'kibana-url': kibanaUrl, 'mappings-dir': mappingsDir } = argv;
  loadAllIndices(esUrl, kibanaUrl, mappingsDir);
};

main();
