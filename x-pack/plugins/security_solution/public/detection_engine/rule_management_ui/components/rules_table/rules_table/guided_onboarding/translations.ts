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
    defaultMessage: 'Install your first prebuilt rule',
  }
);

export const INSTALL_PREBUILT_RULES_CONTENT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.installPrebuiltRules.content',
  {
    defaultMessage:
      'Navigate to the Add Elastic Rules page and install the example "My First Rule".',
  }
);

export const SEARCH_FIRST_RULE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.searchFirstRule.title',
  {
    defaultMessage: 'Find your first rule',
  }
);

export const SEARCH_FIRST_RULE_CONTENT = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.searchFirstRule.content',
    {
      defaultMessage: 'Search for "{name}" or click next.',
      values: { name },
    }
  );

export const ENABLE_FIRST_RULE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.enableFirstRule.title',
  {
    defaultMessage: 'Enable the rule',
  }
);

export const ENABLE_FIRST_RULE_CONTENT = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.enableFirstRule.content',
    {
      defaultMessage: 'Enable "{name}" or click next.',
      values: { name },
    }
  );

export const NEXT_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.guidedOnboarding.nextButton',
  {
    defaultMessage: 'Next',
  }
);
