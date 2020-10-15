/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ADD_NEW_CONNECTOR_DROPDOWN_BUTTON =
  '[data-test-subj="dropdown-connector-add-connector"]';

export const CONNECTOR = (id: string) => {
  return `[data-test-subj='dropdown-connector-${id}']`;
};

export const CONNECTOR_NAME = '[data-test-subj="nameInput"]';

export const CONNECTORS_DROPDOWN = '[data-test-subj="dropdown-connectors"]';

export const PASSWORD = '[data-test-subj="connector-servicenow-password-form-input"]';

export const SAVE_BTN = '[data-test-subj="saveNewActionButton"]';

export const SAVE_CHANGES_BTN = '[data-test-subj="case-configure-action-bottom-bar-save-button"]';

export const SERVICE_NOW_CONNECTOR_CARD = '[data-test-subj=".servicenow-card"]';

export const TOASTER = '[data-test-subj="euiToastHeader"]';

export const URL = '[data-test-subj="apiUrlFromInput"]';

export const USERNAME = '[data-test-subj="connector-servicenow-username-form-input"]';
