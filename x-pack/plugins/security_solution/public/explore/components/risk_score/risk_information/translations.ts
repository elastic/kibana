/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { getRiskEntityTranslation } from '../translations';

export const INFORMATION_LEVEL_HEADER = i18n.translate(
  'xpack.securitySolution.riskInformation.levelHeader',
  {
    defaultMessage: 'Level',
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
export const TITLE = i18n.translate('xpack.securitySolution.riskInformation.title', {
  defaultMessage: 'Entity Risk Analytics',
});

export const CLOSE_BUTTON_TEXT = i18n.translate('xpack.securitySolution.riskInformation.closeBtn', {
  defaultMessage: 'Close',
});

export const INFO_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolution.riskInformation.buttonLabel',
  {
    defaultMessage: 'How is risk score calculated?',
  }
);
