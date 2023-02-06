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
  defaultMessage: 'Case fields',
});

export const STEP_TWO_TITLE = i18n.translate('xpack.cases.create.stepTwoTitle', {
  defaultMessage: 'Case settings',
});

export const STEP_THREE_TITLE = i18n.translate('xpack.cases.create.stepThreeTitle', {
  defaultMessage: 'External Connector Fields',
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
