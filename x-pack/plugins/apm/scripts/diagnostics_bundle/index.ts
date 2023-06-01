/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs';
import { initDiagnosticsBundle } from './diagnostics_bundle';

const { argv } = yargs(process.argv.slice(2))
  .option('esHost', {
    type: 'string',
    description: 'Elasticsearch host name',
  })
  .option('kbHost', {
    type: 'string',
    description: 'Kibana host name',
  })
  .option('username', {
    type: 'string',
    description: 'Kibana host name',
  })
  .option('password', {
    type: 'string',
    description: 'Kibana host name',
  })
  .help();

const { esHost, kbHost, password, username } = argv;

Object.entries({ esHost, kbHost, password, username }).forEach(
  ([key, value]) => {
    if (!value) {
      console.log(`Missing required argument: ${key}`);
      process.exit(1);
    }
  }
);

initDiagnosticsBundle({ esHost, kbHost, password, username })
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });
