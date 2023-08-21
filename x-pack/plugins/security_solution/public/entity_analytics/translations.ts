/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHOW_HOSTS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.hosts.show',
  {
    defaultMessage: 'Show hosts',
  }
);

export const HIDE_HOSTS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.hosts.hide',
  {
    defaultMessage: 'Hide hosts',
  }
);

export const SHOW_USERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.users.show',
  {
    defaultMessage: 'Show users',
  }
);

export const HIDE_USERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.users.hide',
  {
    defaultMessage: 'Hide users',
  }
);

export const RISK_SCORE_MODULE_STATUS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.status',
  {
    defaultMessage: 'Status',
  }
);

export const RISK_SCORE_MODULE_STATUS_ON = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.statusOn',
  {
    defaultMessage: 'On',
  }
);

export const RISK_SCORE_MODULE_STATUS_OFF = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.statusOff',
  {
    defaultMessage: 'Off',
  }
);

export const ENTITY_RISK_SCORING = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.entityRiskScoring',
  {
    defaultMessage: 'Entity risk scoring',
  }
);

export const USEFUL_LINKS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.usefulLinks',
  {
    defaultMessage: 'Useful links',
  }
);

export const EA_DOCS_DASHBOARD = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsDashboard',
  {
    defaultMessage: 'Entity Analytics documentation',
  }
);

export const EA_DOCS_RISK_HOSTS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsHosts',
  {
    defaultMessage: 'Host risk score',
  }
);

export const EA_DOCS_RISK_USERS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsUsers',
  {
    defaultMessage: 'User risk score',
  }
);

export const PREVIEW = i18n.translate('xpack.securitySolution.riskScore.riskScorePreview.preview', {
  defaultMessage: 'Preview',
});

export const PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.previewDescription',
  {
    defaultMessage:
      'The entities shown in the preview are the riskiest found in the 1000 sampled during your chosen timeframe. They may not be the riskiest entities across all of your data.',
  }
);

export const PREVIEW_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.errorTitle',
  {
    defaultMessage: 'Preview failed',
  }
);

export const PREVIEW_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.errorMessage',
  {
    defaultMessage: 'Something went wrong when creating the preview. Please try again.',
  }
);

export const PREVIEW_ERROR_TRY_AGAIN = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.tryAgain',
  {
    defaultMessage: 'Try again',
  }
);

export const PREVIEW_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.queryErrorTitle',
  {
    defaultMessage: 'Invalid query',
  }
);

export const UPDATE_AVAILABLE = i18n.translate('xpack.securitySolution.riskScore.updateAvailable', {
  defaultMessage: 'Update available',
});

export const START_UPDATE = i18n.translate('xpack.securitySolution.riskScore.startUpdate', {
  defaultMessage: 'Start update',
});

export const UPDATING_RISK_ENGINE = i18n.translate(
  'xpack.securitySolution.riskScore.updatingRiskEngine',
  {
    defaultMessage: 'Updating risk engine...',
  }
);

export const UPDATE_RISK_ENGINE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.updateRiskEngineModa.title',
  {
    defaultMessage: 'Do you want to update the entity risk engine?',
  }
);

export const UPDATE_RISK_ENGINE_MODAL_EXISTING_USER_HOST_1 = i18n.translate(
  'xpack.securitySolution.riskScore.updateRiskEngineModal.existingUserHost_1',
  {
    defaultMessage: 'Existing user and host risk score transforms will be deleted',
  }
);

export const UPDATE_RISK_ENGINE_MODAL_EXISTING_USER_HOST_2 = i18n.translate(
  'xpack.securitySolution.riskScore.updateRiskEngineModal.existingUserHost_2',
  {
    defaultMessage: ', as they are no longer required.',
  }
);

export const UPDATE_RISK_ENGINE_MODAL_EXISTING_DATA_1 = i18n.translate(
  'xpack.securitySolution.riskScore.updateRiskEngineModal.existingData_1',
  {
    defaultMessage: 'None of your risk score data will be deleted',
  }
);

export const UPDATE_RISK_ENGINE_MODAL_EXISTING_DATA_2 = i18n.translate(
  'xpack.securitySolution.riskScore.updateRiskEngineModal.existingData_2',
  {
    defaultMessage: ', you will need to remove any old risk score data manually.',
  }
);

export const UPDATE_RISK_ENGINE_MODAL_BUTTON_NO = i18n.translate(
  'xpack.securitySolution.riskScore.updateRiskEngineModal.buttonNo',
  {
    defaultMessage: 'No, not yet',
  }
);

export const UPDATE_RISK_ENGINE_MODAL_BUTTON_YES = i18n.translate(
  'xpack.securitySolution.riskScore.updateRiskEngineModal.buttonYes',
  {
    defaultMessage: 'Yes, update now!',
  }
);

export const ERROR_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.errorPanel.title',
  {
    defaultMessage: 'Sorry, there was an error',
  }
);

export const ERROR_PANEL_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.errorPanel.message',
  {
    defaultMessage: 'Something went wrong. Try again later.',
  }
);

export const ERROR_PANEL_ERRORS = i18n.translate(
  'xpack.securitySolution.riskScore.errorPanel.errors',
  {
    defaultMessage: 'Errors',
  }
);

export const UPDATE_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.updatePanel.title',
  {
    defaultMessage: 'New entity risk scoring engine available',
  }
);

export const UPDATE_PANEL_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.updatePanel.message',
  {
    defaultMessage:
      'A new entity risk scoring engine is available. Update now to get the latest features.',
  }
);

export const UPDATE_PANEL_GO_TO_MANAGE = i18n.translate(
  'xpack.securitySolution.riskScore.updatePanel.goToManage',
  {
    defaultMessage: 'Manage',
  }
);

export const UPDATE_PANEL_GO_TO_DISMISS = i18n.translate(
  'xpack.securitySolution.riskScore.updatePanel.Dismiss',
  {
    defaultMessage: 'Dismiss',
  }
);

export const getMaxSpaceTitle = (maxSpaces: number) =>
  i18n.translate('xpack.securitySolution.riskScore.maxSpacePanel.title', {
    defaultMessage:
      'Entity Risk Scoring in the current version can run in {maxSpaces} Kibana spaces.',
    values: { maxSpaces },
  });

export const MAX_SPACE_PANEL_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.maxSpacePanel.message',
  {
    defaultMessage: 'Please disable a currently running engine before enabling it here.',
  }
);
