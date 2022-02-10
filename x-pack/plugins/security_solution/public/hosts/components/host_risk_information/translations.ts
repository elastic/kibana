/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INFORMATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.informationAriaLabel',
  {
    defaultMessage: 'Information',
  }
);

export const INFORMATION_CLASSIFICATION_HEADER = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.classificationHeader',
  {
    defaultMessage: 'Classification',
  }
);

export const INFORMATION_RISK_HEADER = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.riskHeader',
  {
    defaultMessage: 'Host risk score range',
  }
);

export const UNKNOWN_RISK_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.unknownRiskDescription',
  {
    defaultMessage: 'Less than 20',
  }
);

export const CRITICAL_RISK_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.criticalRiskDescription',
  {
    defaultMessage: '90 and above',
  }
);

export const TITLE = i18n.translate('xpack.securitySolution.hosts.hostRiskInformation.title', {
  defaultMessage: 'How is host risk calculated?',
});

export const INTRODUCTION = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.introduction',
  {
    defaultMessage:
      'The Host Risk Score capability surfaces risky hosts from within your environment.',
  }
);

export const EXPLANATION_MESSAGE = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.explanation',
  {
    defaultMessage:
      'This feature utilizes a transform, with a scripted metric aggregation to calculate host risk scores based on detection rule alerts with an "open" status, within a 5 day time window. The transform runs hourly to keep the score updated as new detection rule alerts stream in.',
  }
);

export const CLOSE_BUTTON_LTEXT = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.closeBtn',
  {
    defaultMessage: 'Close',
  }
);

export const INFO_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolution.hosts.hostRiskInformation.buttonLabel',
  {
    defaultMessage: 'How is risk score calculated?',
  }
);
