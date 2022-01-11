/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ArchiverMethod {
  SAVE = 'save',
  LOAD = 'load',
  UNLOAD = 'unload',
}

export const runKbnArchiverScript = (method: ArchiverMethod, fileName: string) => {
  const {
    ELASTICSEARCH_USERNAME,
    ELASTICSEARCH_PASSWORD,
    hostname: HOSTNAME,
    configport: PORT,
  } = Cypress.env();
  const script = `node ../../../scripts/kbn_archiver.js --kibana-url http://${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}@${HOSTNAME}:${PORT} ${method} ./cypress/fixtures/saved_objects/${fileName}.ndjson`;

  cy.exec(script, { env: { NODE_TLS_REJECT_UNAUTHORIZED: 1 } });
};
