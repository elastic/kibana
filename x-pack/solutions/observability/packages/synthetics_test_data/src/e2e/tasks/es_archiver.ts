/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { execSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';

const ES_ARCHIVE_DIR = './fixtures/es_archiver';

// Otherwise execSync would inject NODE_TLS_REJECT_UNAUTHORIZED=0 and node would abort if used over https
const NODE_TLS_REJECT_UNAUTHORIZED = '1';

export const esArchiverLoad = (folder: string) => {
  const path = Path.join(ES_ARCHIVE_DIR, folder);
  execSync(
    `node ${REPO_ROOT}/scripts/es_archiver load "${path}" --config ${REPO_ROOT}/test/functional/config.base.js`,
    { env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED }, stdio: 'inherit' }
  );
};

export const esArchiverUnload = (folder: string) => {
  const path = Path.join(ES_ARCHIVE_DIR, folder);
  execSync(
    `node ${REPO_ROOT}/scripts/es_archiver unload "${path}" --config ${REPO_ROOT}/test/functional/config.base.js`,
    { env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED }, stdio: 'inherit' }
  );
};
