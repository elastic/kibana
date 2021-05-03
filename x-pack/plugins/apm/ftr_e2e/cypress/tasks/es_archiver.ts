/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const esArchiverLoad = (folder: string) => {
  cy.exec(
    `node ../../../../scripts/es_archiver load ${folder} --dir ./cypress/fixtures/es_archiver --config ../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const esArchiverUnload = (folder: string) => {
  cy.exec(
    `node ../../../../scripts/es_archiver unload ${folder} --dir ./cypress/fixtures/es_archiver --config ../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const esArchiverResetKibana = () => {
  cy.exec(
    `node ../../../../scripts/es_archiver empty-kibana-index --config ../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`,
    { failOnNonZeroExit: false }
  );
};
