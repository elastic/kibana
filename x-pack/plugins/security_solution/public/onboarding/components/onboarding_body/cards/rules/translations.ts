/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULES_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.rulesCard.title',
  {
    defaultMessage: 'Enable rules',
  }
);

export const RULES_CARD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.rulesCard.description',
  {
    defaultMessage:
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are met.',
  }
);

export const RULES_CARD_CALLOUT_INTEGRATIONS_TEXT = i18n.translate(
  'xpack.securitySolution.onboarding.rulesCard.calloutIntegrationsText',
  {
    defaultMessage: 'To add Elastic rules add integrations first.',
  }
);

export const RULES_CARD_CALLOUT_INTEGRATIONS_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.rulesCard.calloutIntegrationsButton',
  {
    defaultMessage: 'Add integrations step',
  }
);

export const RULES_CARD_ADD_RULES_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.rulesCard.addRulesButton',
  {
    defaultMessage: 'Add Elastic rules',
  }
);
