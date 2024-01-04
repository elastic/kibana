/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OBSERVED_BADGE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.observedBadge',
  {
    defaultMessage: 'OBSERVED',
  }
);

export const MANAGED_BADGE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.managedBadge',
  {
    defaultMessage: 'MANAGED',
  }
);

export const USER = i18n.translate('xpack.securitySolution.timeline.userDetails.userLabel', {
  defaultMessage: 'User',
});

export const FAIL_MANAGED_USER = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.failManagedUserDescription',
  {
    defaultMessage: 'Failed to run search on user managed data',
  }
);

export const MANAGED_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.managedDataTitle',
  {
    defaultMessage: 'Managed data',
  }
);

export const OBSERVED_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.observedDataTitle',
  {
    defaultMessage: 'Observed data',
  }
);

export const ENTRA_DATA_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.EntraDataPanelTitle',
  {
    defaultMessage: 'Entra ID data',
  }
);

export const OKTA_DATA_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.hideOktaDataPanelTitle',
  {
    defaultMessage: 'Okta data',
  }
);

export const RISK_SCORE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.riskScoreLabel',
  {
    defaultMessage: 'Risk score',
  }
);

export const VALUES_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.valuesColumnTitle',
  {
    defaultMessage: 'Values',
  }
);

export const FIELD_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.fieldColumnTitle',
  {
    defaultMessage: 'Field',
  }
);

export const NO_ACTIVE_INTEGRATION_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.noActiveIntegrationTitle',
  {
    defaultMessage: 'You don’t have any active asset repository integrations',
  }
);

export const NO_ACTIVE_INTEGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.noActiveIntegrationText',
  {
    defaultMessage:
      'Additional metadata from integrations may help you to manage and identify risky entities.',
  }
);

export const ADD_EXTERNAL_INTEGRATION_BUTTON = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.addExternalIntegrationButton',
  {
    defaultMessage: 'Add asset repository integrations',
  }
);

export const NO_MANAGED_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.noAzureDataTitle',
  {
    defaultMessage: 'No metadata found for this user',
  }
);

export const NO_MANAGED_DATA_TEXT = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.noAzureDataText',
  {
    defaultMessage:
      'If you expected to see metadata for this user, make sure you have configured your integrations properly.',
  }
);

export const CLOSE_BUTTON = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.closeButton',
  {
    defaultMessage: 'close',
  }
);

export const MANAGED_USER_INSPECT_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.userDetails.managedUserInspectTitle',
  {
    defaultMessage: 'Managed user',
  }
);
