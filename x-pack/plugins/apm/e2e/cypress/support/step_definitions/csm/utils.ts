/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from './csm_dashboard';

export function getDataTestSubj(dataTestSubj: string) {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');

  return cy.get(`[data-test-subj=${dataTestSubj}]`, DEFAULT_TIMEOUT);
}
