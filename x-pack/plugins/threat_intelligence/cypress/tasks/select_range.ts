/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_STATE, TIME_RANGE_PICKER } from '../screens/indicators';

export const selectRange = () => {
  cy.get(EMPTY_STATE);

  cy.get(TIME_RANGE_PICKER).first().click({ force: true });
  cy.get('[aria-label="Time unit"]').select('y');
  cy.get('[data-test-subj="superDatePickerQuickMenu"] .euiQuickSelect__applyButton').click({
    force: true,
  });
};
