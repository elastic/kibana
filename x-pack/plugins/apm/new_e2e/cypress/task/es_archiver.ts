/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const esArchiverLoad = (folder: string) => {
  cy.exec(
    `node ../../../scripts/es_archiver load ${folder} --dir ./new_e2e/cypress/fixtures/es_archives --config ../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const esArchiverUnload = (folder: string) => {
  cy.exec(
    `node ../../../scripts/es_archiver unload ${folder} --dir ./new_e2e/cypress/fixtures/es_archives --config ../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};
