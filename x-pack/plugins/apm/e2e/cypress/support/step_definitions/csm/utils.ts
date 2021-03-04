/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TIMEOUT } from './csm_dashboard';

export function waitForLoadingToFinish() {
  cy.get('[data-test-subj=globalLoadingIndicator-hidden]', DEFAULT_TIMEOUT);
}

export function getDataTestSubj(dataTestSubj: string) {
  waitForLoadingToFinish();

  return cy.get(`[data-test-subj=${dataTestSubj}]`, DEFAULT_TIMEOUT);
}
