/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

const ES_ARCHIVE_DIR = './cypress/fixtures/es_archiver';

export const esArchiverLoad = (folder: string) => {
  const path = Path.join(ES_ARCHIVE_DIR, folder);
  cy.exec(
    `node ../../../../scripts/es_archiver load "${path}" --config ../../../test/functional/config.js`
  );
};

export const esArchiverUnload = (folder: string) => {
  const path = Path.join(ES_ARCHIVE_DIR, folder);
  cy.exec(
    `node ../../../../scripts/es_archiver unload "${path}" --config ../../../test/functional/config.js`
  );
};

export const esArchiverResetKibana = () => {
  cy.exec(
    `node ../../../../scripts/es_archiver empty-kibana-index --config ../../../test/functional/config.js`,
    { failOnNonZeroExit: false }
  );
};
