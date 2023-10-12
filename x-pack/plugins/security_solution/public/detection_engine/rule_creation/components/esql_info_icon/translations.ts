/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.esqlInfoAriaLabel',
  {
    defaultMessage: `Open help popover`,
  }
);

export const getTooltipContent = (esqlRuleTypeLink: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.esqlInfoTooltipContent',
    {
      defaultMessage: `Check out our {esqlRuleTypeLink} to get started using ES|QL rules in Security.`,
      values: {
        esqlRuleTypeLink: `[documentation](${esqlRuleTypeLink})`,
      },
    }
  );
