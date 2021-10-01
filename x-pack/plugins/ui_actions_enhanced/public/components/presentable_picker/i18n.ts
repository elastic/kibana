/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const txtBetaActionFactoryLabel = i18n.translate(
  'xpack.uiActionsEnhanced.components.actionWizard.betaActionLabel',
  {
    defaultMessage: `Beta`,
  }
);

export const txtBetaActionFactoryTooltip = i18n.translate(
  'xpack.uiActionsEnhanced.components.actionWizard.betaActionTooltip',
  {
    defaultMessage: `This action is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features. Please help us by reporting bugs or providing other feedback.`,
  }
);

export const txtInsufficientLicenseLevel = i18n.translate(
  'xpack.uiActionsEnhanced.components.actionWizard.insufficientLicenseLevelTooltip',
  {
    defaultMessage: 'Insufficient license level',
  }
);
