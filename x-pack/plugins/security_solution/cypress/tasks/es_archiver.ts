/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

const ES_ARCHIVE_DIR = '../../test/security_solution_cypress/es_archives';
const CONFIG_PATH = '../../test/functional/config.js';
const ES_URL = Cypress.env('ELASTICSEARCH_URL');
const KIBANA_URL = Cypress.config().baseUrl;

export const esArchiverLoad = (folder: string) => {
  const path = Path.join(ES_ARCHIVE_DIR, folder);
  cy.exec(
    `node ../../../scripts/es_archiver load "${path}" --config "${CONFIG_PATH}" --es-url "${ES_URL}" --kibana-url "${KIBANA_URL}"`
  );
};

export const esArchiverUnload = (folder: string) => {
  const path = Path.join(ES_ARCHIVE_DIR, folder);
  cy.exec(
    `node ../../../scripts/es_archiver unload "${path}" --config "${CONFIG_PATH}" --es-url "${ES_URL}" --kibana-url "${KIBANA_URL}"`
  );
};

export const esArchiverResetKibana = () => {
  cy.exec(
    `node ../../../scripts/es_archiver empty-kibana-index --config "${CONFIG_PATH}" --es-url "${ES_URL}" --kibana-url "${KIBANA_URL}"`,
    { failOnNonZeroExit: false }
  );
};
