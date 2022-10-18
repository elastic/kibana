/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { getRiskEntityTranslation } from '../translations';

export const INFORMATION_CLASSIFICATION_HEADER = i18n.translate(
  'xpack.securitySolution.riskInformation.classificationHeader',
  {
    defaultMessage: 'Classification',
  }
);

export const INFORMATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.riskInformation.informationAriaLabel',
  {
    defaultMessage: 'Information',
  }
);

export const INFORMATION_RISK_HEADER = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.riskInformation.riskHeader', {
    defaultMessage: '{riskEntity} risk score range',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const UNKNOWN_RISK_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskInformation.unknownRiskDescription',
  {
    defaultMessage: 'Less than 20',
  }
);

export const CRITICAL_RISK_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskInformation.criticalRiskDescription',
  {
    defaultMessage: '90 and above',
  }
);
export const TITLE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.riskInformation.title', {
    defaultMessage: 'How is {riskEntity} risk calculated?',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity, true),
    },
  });

export const INTRODUCTION = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.riskInformation.introduction', {
    defaultMessage:
      'The {riskEntity} Risk Score capability surfaces risky {riskEntityLowerPlural} from within your environment.',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
      riskEntityLowerPlural: getRiskEntityTranslation(riskEntity, true, true),
    },
  });

export const EXPLANATION_MESSAGE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.riskInformation.explanation', {
    defaultMessage:
      'This feature utilizes a transform, with a scripted metric aggregation to calculate {riskEntityLower} risk scores based on detection rule alerts with an "open" status, within a 5 day time window. The transform runs hourly to keep the score updated as new detection rule alerts stream in.',
    values: {
      riskEntityLower: getRiskEntityTranslation(riskEntity, true),
    },
  });

export const CLOSE_BUTTON_LTEXT = i18n.translate(
  'xpack.securitySolution.riskInformation.closeBtn',
  {
    defaultMessage: 'Close',
  }
);

export const INFO_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolution.riskInformation.buttonLabel',
  {
    defaultMessage: 'How is risk score calculated?',
  }
);
