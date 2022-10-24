/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EMAIL_ACTION_BTN = '[data-test-subj=".email-siem-ActionTypeSelectOption"]';

export const CREATE_ACTION_CONNECTOR_BTN = '[data-test-subj="createActionConnectorButton-0"]';

export const SAVE_ACTION_CONNECTOR_BTN = '[data-test-subj="saveActionButtonModal"]';

export const EMAIL_ACTION_TO_INPUT = '[data-test-subj="toEmailAddressInput"]';

export const EMAIL_ACTION_SUBJECT_INPUT = '[data-test-subj="subjectInput"]';

export const SLACK_ACTION_BTN = '[data-test-subj=".slack-siem-ActionTypeSelectOption"]';

export const SLACK_ACTION_MESSAGE_TEXTAREA = '[data-test-subj="messageTextArea"]';

export const CONNECTOR_NAME_INPUT = '[data-test-subj="nameInput"]';

export const EMAIL_CONNECTOR_FROM_INPUT = '[data-test-subj="emailFromInput"]';

export const EMAIL_CONNECTOR_HOST_INPUT = '[data-test-subj="emailHostInput"]';

export const EMAIL_CONNECTOR_PORT_INPUT = '[data-test-subj="emailPortInput"]';

export const EMAIL_CONNECTOR_USER_INPUT = '[data-test-subj="emailUserInput"]';

export const EMAIL_CONNECTOR_PASSWORD_INPUT = '[data-test-subj="emailPasswordInput"]';

export const EMAIL_CONNECTOR_SERVICE_SELECTOR = '[data-test-subj="emailServiceSelectInput"]';

export const FORM_VALIDATION_ERROR = '.euiFormErrorText';

export const JSON_EDITOR = "[data-test-subj='actionJsonEditor']";

export const INDEX_SELECTOR = "[data-test-subj='.index-siem-ActionTypeSelectOption']";

export const actionFormSelector = (position: number) =>
  `[data-test-subj="alertActionAccordion-${position}"]`;
