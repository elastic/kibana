/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INSTALL_PREBUILT_RULES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.installPrebuiltRules.title',
  {
    defaultMessage: 'Load the Elastic prebuilt rules',
  }
);

export const INSTALL_PREBUILT_RULES_CONTENT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.installPrebuiltRules.content',
  {
    defaultMessage: 'To get started you need to load the Elastic prebuilt rules.',
  }
);

export const SEARCH_FIRST_RULE_TITLE = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.searchFirstRule.title',
    {
      defaultMessage: 'Search for "{name}" rule',
      values: { name },
    }
  );

export const SEARCH_FIRST_RULE_CONTENT = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.searchFirstRule.content',
    {
      defaultMessage: 'Find the "{name}" rule.',
      values: { name },
    }
  );

export const ENABLE_FIRST_RULE_TITLE = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.enableFirstRule.title',
    {
      defaultMessage: 'Enable "{name}" rule',
      values: { name },
    }
  );

export const ENABLE_FIRST_RULE_CONTENT = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.enableFirstRule.content',
    {
      defaultMessage: 'Enable the "{name}" rule.',
      values: { name },
    }
  );

export const NEXT_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.nextButton',
  {
    defaultMessage: 'Next',
  }
);
