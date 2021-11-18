/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync } from 'child_process';
import path from 'path';

export function createEmptyMappings({
  esUrl,
  kibanaUrl,
}: {
  esUrl: string;
  kibanaUrl: string;
}) {
  // Otherwise execSync would inject NODE_TLS_REJECT_UNAUTHORIZED=0 and node would abort if used over https
  const NODE_TLS_REJECT_UNAUTHORIZED = '1';

  const esArchiverBinPath = path.resolve(
    __dirname,
    '../../../../../scripts/es_archiver'
  );

  const archiveFilePath = path.resolve(
    __dirname,
    '../../ftr_e2e/cypress/fixtures/es_archiver/apm_mappings_only_8.0.0'
  );

  const configPath = path.resolve(
    __dirname,
    '../../../../test/functional/config.js'
  );

  const cmd = `node ${esArchiverBinPath} load "${archiveFilePath}" --es-url=${esUrl} --kibana-url=${kibanaUrl} --config=${configPath}`;
  execSync(cmd, { env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED } });

  console.log('Mappings created');
}
