/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync, truncateSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { argv } from 'yargs';
import { mergeApmTelemetryMapping } from '../../common/apm_telemetry';

function errorExit(error?: Error) {
  console.error(`usage: ${argv.$0} /path/to/xpack-phone-home.json`); // eslint-disable-line no-console
  if (error) {
    throw error;
  }
  process.exit(1);
}

try {
  const filename = resolve(argv._[0]);
  const xpackPhoneHomeMapping = JSON.parse(readFileSync(filename, 'utf-8'));

  const newMapping = mergeApmTelemetryMapping(xpackPhoneHomeMapping);

  truncateSync(filename);
  writeFileSync(filename, JSON.stringify(newMapping, null, 2));
} catch (error) {
  errorExit(error);
}
