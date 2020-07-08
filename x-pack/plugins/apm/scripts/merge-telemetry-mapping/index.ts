/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync, truncateSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { argv } from 'yargs';
import {
  getApmTelemetryMappingFullPath,
  mergeApmTelemetryMapping,
} from '../../common/apm_telemetry';

function errorExit(error?: Error) {
  // eslint-disable-next-line no-console
  console.error(
    `\n    usage: ${argv.$0} /path/to/telemetry/repo migration-slug stack-minor-version\n`
  );
  if (error) {
    throw error;
  }
  process.exit(1);
}

try {
  const telemetryRepoPath = argv._[0];
  const filename = resolve(
    join(telemetryRepoPath, 'config/templates/xpack-phone-home.json')
  );
  const slug = argv._[1];
  const stackMinorVersion = argv._[2];

  if (!slug || !telemetryRepoPath || !stackMinorVersion) {
    errorExit();
  }

  const xpackPhoneHomeMapping = JSON.parse(readFileSync(filename, 'utf-8'));
  const migrationFilename = resolve(
    join(telemetryRepoPath, 'mapping_migrations', `00XX-${slug}`)
  );
  const newMapping = mergeApmTelemetryMapping(xpackPhoneHomeMapping);
  // The suffix for the all-xpack-phone-home index. Will be "202*" for the 2020s
  const allSuffix = new Date().getFullYear().toString().replace(/.$/, '*');
  const versionQuery = {
    query: { range: { 'version.minor': { gte: String(stackMinorVersion) } } },
  };
  truncateSync(filename);
  writeFileSync(filename, JSON.stringify(newMapping, null, 2));

  writeFileSync(
    migrationFilename,
    [
      `PUT xpack-phone-home,all-xpack-phone-home-${allSuffix}/_mapping`,
      JSON.stringify(getApmTelemetryMappingFullPath(), null, 2),
      '',
      `POST xpack-phone-home,all-xpack-phone-home-${allSuffix}/_update_by_query?wait_for_completion=false&conflicts=proceed`,
      JSON.stringify(versionQuery, null, 2),
    ].join('\n')
  );
} catch (error) {
  errorExit(error);
}
