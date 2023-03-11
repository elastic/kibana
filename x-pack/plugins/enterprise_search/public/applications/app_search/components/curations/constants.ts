/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIconProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const CURATIONS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.title',
  { defaultMessage: 'Curations' }
);
export const CURATIONS_OVERVIEW_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.overview.title',
  { defaultMessage: 'Curated results' }
);
export const CREATE_NEW_CURATION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.create.title',
  { defaultMessage: 'Create a curation' }
);
export const MANAGE_CURATION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.manage.title',
  { defaultMessage: 'Manage curation' }
);

export const QUERY_INPUTS_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.addQueryButtonLabel',
  { defaultMessage: 'Add query' }
);
export const QUERY_INPUTS_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.queryPlaceholder',
  { defaultMessage: 'Enter a query' }
);

export const DELETE_CONFIRMATION_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.deleteConfirmation',
  { defaultMessage: 'Are you sure you want to remove this curation?' }
);
export const DELETE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.deleteSuccessMessage',
  { defaultMessage: 'Your curation was deleted' }
);
export const RESTORE_CONFIRMATION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.restoreConfirmation',
  {
    defaultMessage:
      'Are you sure you want to clear your changes and return to your default results?',
  }
);

export const CONVERT_TO_MANUAL_CONFIRMATION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.convertToManualCurationConfirmation',
  {
    defaultMessage: 'Are you sure you want to convert this to a manual curation?',
  }
);

export const RESULT_ACTIONS_DIRECTIONS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.resultActionsDescription',
  { defaultMessage: 'Promote results by clicking the star, hide them by clicking the eye.' }
);
export const PROMOTE_DOCUMENT_ACTION = {
  title: i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.promoteButtonLabel', {
    defaultMessage: 'Promote this result',
  }),
  iconType: 'starPlusEmpty',
  iconColor: 'primary' as EuiButtonIconProps['color'],
};
export const DEMOTE_DOCUMENT_ACTION = {
  title: i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.demoteButtonLabel', {
    defaultMessage: 'Demote this result',
  }),
  iconType: 'starMinusFilled',
  iconColor: 'primary' as EuiButtonIconProps['color'],
};
export const HIDE_DOCUMENT_ACTION = {
  title: i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.hideButtonLabel', {
    defaultMessage: 'Hide this result',
  }),
  iconType: 'eyeClosed',
  iconColor: 'danger' as EuiButtonIconProps['color'],
};
export const SHOW_DOCUMENT_ACTION = {
  title: i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.showButtonLabel', {
    defaultMessage: 'Show this result',
  }),
  iconType: 'eye',
  iconColor: 'primary' as EuiButtonIconProps['color'],
};

export const AUTOMATED_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curation.automatedLabel',
  { defaultMessage: 'Automated' }
);

export const COVERT_TO_MANUAL_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curation.convertToManualCurationButtonLabel',
  { defaultMessage: 'Convert to manual curation' }
);
