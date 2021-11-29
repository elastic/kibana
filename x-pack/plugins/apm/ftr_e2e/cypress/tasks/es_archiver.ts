/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { execSync } from 'child_process';

const ES_ARCHIVE_DIR = path.resolve(
  __dirname,
  '../../cypress/fixtures/es_archiver'
);

// Otherwise execSync would inject NODE_TLS_REJECT_UNAUTHORIZED=0 and node would abort if used over https
const NODE_TLS_REJECT_UNAUTHORIZED = '1';

export const esArchiverLoad = (archiveName: string) => {
  const archivePath = path.join(ES_ARCHIVE_DIR, archiveName);
  execSync(
    `node ../../../../scripts/es_archiver load "${archivePath}" --config ../../../test/functional/config.js`,
    { env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED }, stdio: 'inherit' }
  );
};

export const esArchiverUnload = (archiveName: string) => {
  const archivePath = path.join(ES_ARCHIVE_DIR, archiveName);
  execSync(
    `node ../../../../scripts/es_archiver unload "${archivePath}" --config ../../../test/functional/config.js`,
    { env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED }, stdio: 'inherit' }
  );
};

export const esArchiverResetKibana = () => {
  execSync(
    `node ../../../../scripts/es_archiver empty-kibana-index --config ../../../test/functional/config.js`,
    { env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED }, stdio: 'inherit' }
  );
};
