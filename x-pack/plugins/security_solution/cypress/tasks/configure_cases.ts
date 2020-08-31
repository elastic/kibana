/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ADD_NEW_CONNECTOR_DROPDOWN_BUTTON,
  CONNECTOR,
  CONNECTOR_NAME,
  CONNECTORS_DROPDOWN,
  PASSWORD,
  SAVE_BTN,
  SERVICE_NOW_CONNECTOR_CARD,
  URL,
  USERNAME,
} from '../screens/configure_cases';
import { MAIN_PAGE } from '../screens/security_main';

import { Connector } from '../objects/case';

export const addServiceNowConnector = (connector: Connector) => {
  cy.get(SERVICE_NOW_CONNECTOR_CARD).click();
  cy.get(CONNECTOR_NAME).type(connector.connectorName);
  cy.get(URL).type(connector.URL);
  cy.get(USERNAME).type(connector.username);
  cy.get(PASSWORD).type(connector.password);
  cy.get(SAVE_BTN).click({ force: true });
};

export const openAddNewConnectorOption = () => {
  cy.get(MAIN_PAGE).then(($page) => {
    if ($page.find(SERVICE_NOW_CONNECTOR_CARD).length !== 1) {
      cy.wait(1000);
      cy.get(CONNECTORS_DROPDOWN).click({ force: true });
      cy.get(ADD_NEW_CONNECTOR_DROPDOWN_BUTTON).click();
    }
  });
};

export const selectLastConnectorCreated = () => {
  cy.get(CONNECTORS_DROPDOWN).click({ force: true });
  cy.get('@createConnector')
    .its('response')
    .then((response) => {
      cy.get(CONNECTOR(response.body.id)).click();
    });
};
