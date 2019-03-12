/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const storybook = require('@storybook/react/standalone');
const execa = require('execa');

// We have to start up the Kibana server to process CSS files as we change them.
// This is pretty much a hack for the moment.  We can get a separate process up
// and running in the future.
execa(
  process.execPath,
  [
    'scripts/kibana',
    '--optimize.enabled=false',
    '--env.name="development"',
    '--plugins.initialize=false',
    '--server.port=5699',
  ],
  {
    cwd: path.resolve(__dirname, '../../../..'),
    stdio: ['ignore', 'inherit', 'inherit'],
    buffer: false,
  }
).catch(err => {
  console.log('Kibana server died:', err.message);
  process.exit(1);
});

storybook({
  mode: 'dev',
  port: 9001,
  configDir: path.resolve(__dirname, './../.storybook'),
});
