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
  const script = `node ../../../scripts/kbn_archiver.js --kibana-url http://elastic:changeme@localhost:5620 ${method} ./cypress/fixtures/saved_objects/${fileName}.ndjson`;

  cy.exec(script, { env: { NODE_TLS_REJECT_UNAUTHORIZED: 1 } });
};
