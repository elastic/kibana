/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INFORMATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.informationAriaLabel',
  {
    defaultMessage: 'Information',
  }
);

export const INFORMATION_CLASSIFICATION_HEADER = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.classificationHeader',
  {
    defaultMessage: 'Classification',
  }
);

export const INFORMATION_RISK_HEADER = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.riskHeader',
  {
    defaultMessage: 'User risk score range',
  }
);

export const UNKNOWN_RISK_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.unknownRiskDescription',
  {
    defaultMessage: 'Less than 20',
  }
);

export const CRITICAL_RISK_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.criticalRiskDescription',
  {
    defaultMessage: '90 and above',
  }
);

export const TITLE = i18n.translate('xpack.securitySolution.users.userRiskInformation.title', {
  defaultMessage: 'How is user risk calculated?',
});

export const INTRODUCTION = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.introduction',
  {
    defaultMessage:
      'The User Risk Score capability surfaces risky users from within your environment.',
  }
);

export const EXPLANATION_MESSAGE = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.explanation',
  {
    defaultMessage:
      'This feature utilizes a transform, with a scripted metric aggregation to calculate user risk scores based on detection rule alerts with an "open" status, within a 5 day time window. The transform runs hourly to keep the score updated as new detection rule alerts stream in.',
  }
);

export const CLOSE_BUTTON_LTEXT = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.closeBtn',
  {
    defaultMessage: 'Close',
  }
);

export const INFO_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolution.users.userRiskInformation.buttonLabel',
  {
    defaultMessage: 'How is risk score calculated?',
  }
);
