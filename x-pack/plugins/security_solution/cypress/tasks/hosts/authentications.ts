/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATIONS_TABLE } from '../../screens/hosts/authentications';
import { REFRESH_BUTTON, REFRESH_ICON } from '../../screens/security_header';

export const waitForAuthenticationsToBeLoaded = () => {
  cy.get(AUTHENTICATIONS_TABLE).should('exist');
  cy.get(REFRESH_BUTTON).get(REFRESH_ICON).first().should('not.have.text', 'Updating');
};
