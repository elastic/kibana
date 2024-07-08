/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';
export * from '../user_profiles/translations';

export const STEP_ONE_TITLE = i18n.translate('xpack.cases.create.stepOneTitle', {
  defaultMessage: 'Select template',
});

export const STEP_TWO_TITLE = i18n.translate('xpack.cases.create.stepTwoTitle', {
  defaultMessage: 'Case fields',
});

export const STEP_THREE_TITLE = i18n.translate('xpack.cases.create.stepThreeTitle', {
  defaultMessage: 'Case settings',
});

export const STEP_FOUR_TITLE = i18n.translate('xpack.cases.create.stepFourTitle', {
  defaultMessage: 'External Connector Fields',
});

export const ADDITIONAL_FIELDS = i18n.translate('xpack.cases.create.additionalFields', {
  defaultMessage: 'Additional fields',
});

export const SYNC_ALERTS_LABEL = i18n.translate('xpack.cases.create.syncAlertsLabel', {
  defaultMessage: 'Sync alert status with case status',
});

export const ASSIGN_YOURSELF = i18n.translate('xpack.cases.create.assignYourself', {
  defaultMessage: 'Assign yourself',
});

export const MODAL_TITLE = i18n.translate('xpack.cases.create.modalTitle', {
  defaultMessage: 'Discard case?',
});

export const CANCEL_MODAL_BUTTON = i18n.translate('xpack.cases.create.cancelModalButton', {
  defaultMessage: 'Cancel',
});

export const CONFIRM_MODAL_BUTTON = i18n.translate('xpack.cases.create.confirmModalButton', {
  defaultMessage: 'Exit without saving',
});

export const TEMPLATE_LABEL = i18n.translate('xpack.cases.create.templateLabel', {
  defaultMessage: 'Template name',
});

export const TEMPLATE_HELP_TEXT = i18n.translate('xpack.cases.create.templateHelpText', {
  defaultMessage: 'Selecting a template will pre-fill certain case fields below',
});

export const SOLUTION_SELECTOR_LABEL = i18n.translate('xpack.cases.create.solutionSelectorLabel', {
  defaultMessage: 'Create case under:',
});

export const DEFAULT_EMPTY_TEMPLATE_NAME = i18n.translate(
  'xpack.cases.create.defaultEmptyTemplateName',
  {
    defaultMessage: 'No template selected',
  }
);
