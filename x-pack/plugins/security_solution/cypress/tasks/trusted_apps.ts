/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRUSTED_APPLICATIONS_TAB,
  TRUSTED_APPLICATIONS_LIST_COUNTER,
} from '../screens/trusted_apps';

export const goToTrustedApplicationsList = () => {
  cy.get(TRUSTED_APPLICATIONS_TAB).click();
  cy.waitFor(TRUSTED_APPLICATIONS_LIST_COUNTER, 3000);
};
