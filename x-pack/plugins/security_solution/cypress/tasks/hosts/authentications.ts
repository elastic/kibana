/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATIONS_TABLE } from '../../screens/hosts/authentications';
import { REFRESH_BUTTON } from '../../screens/security_header';

export const waitForAuthenticationsToBeLoaded = () => {
  cy.get(AUTHENTICATIONS_TABLE).should('exist');
  cy.get(REFRESH_BUTTON).invoke('text').should('not.equal', 'Updating');
};
