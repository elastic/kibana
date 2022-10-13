/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs';

const { argv } = yargs(process.argv.slice(2))
  .option('headless', {
    default: true,
    type: 'boolean',
    description: 'Start in headless mode',
  })
  .option('bail', {
    default: false,
    type: 'boolean',
    description: 'Pause on error',
  })
  .option('grep', {
    default: undefined,
    type: 'string',
    description: 'run only journeys with a name or tags that matches the glob',
  })
  .help();

export { argv };
