/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_HOSTS_TABLE, HOSTS_NAMES } from '../../screens/hosts/all_hosts';

export const openFirstHostDetails = () => {
  cy.get(HOSTS_NAMES).first().click({ force: true });
};

export const waitForAllHostsToBeLoaded = () => {
  cy.get(ALL_HOSTS_TABLE).should('be.visible');
};
