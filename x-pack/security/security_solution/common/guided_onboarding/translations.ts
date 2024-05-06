/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.securitySolution.guideConfig.title', {
  defaultMessage: 'Detect threats in my data with SIEM',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.guideConfig.description', {
  defaultMessage: `There are many ways to get your SIEM data into Elastic. In this guide, we'll help you get set up quickly using the Elastic Defend integration.`,
});

export const DOCS = i18n.translate('xpack.securitySolution.guideConfig.documentationLink', {
  defaultMessage: 'Learn more',
});

export const LINK_TEXT = i18n.translate(
  'xpack.securitySolution.guideConfig.addDataStep.description.linkText',
  {
    defaultMessage: 'Learn more',
  }
);

export const ADD_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.guideConfig.addDataStep.title',
  {
    defaultMessage: 'Add data with Elastic Defend',
  }
);

export const ADD_DATA_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.guideConfig.addDataStep.description',
  {
    defaultMessage:
      'Install Elastic Agent and its Elastic Defend integration on one of your computers to get SIEM data flowing.',
  }
);

export const RULES_TITLE = i18n.translate('xpack.securitySolution.guideConfig.rulesStep.title', {
  defaultMessage: 'Turn on rules',
});

export const RULES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.guideConfig.rulesStep.description',
  {
    defaultMessage:
      'Load the Elastic prebuilt rules, select the rules you want, and enable them to generate alerts.',
  }
);

export const RULES_MANUAL_TITLE = i18n.translate(
  'xpack.securitySolution.guideConfig.rulesStep.manualCompletion.title',
  {
    defaultMessage: 'Continue with the guide',
  }
);

export const RULES_MANUAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.guideConfig.rulesStep.manualCompletion.description',
  {
    defaultMessage: `After you've enabled the rules you need, continue.`,
  }
);

export const CASES_TITLE = i18n.translate('xpack.securitySolution.guideConfig.alertsStep.title', {
  defaultMessage: 'Manage alerts and cases',
});
export const CASES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.guideConfig.alertsStep.description',
  {
    defaultMessage: 'Learn how to view and triage alerts with cases.',
  }
);

export const CASES_MANUAL_TITLE = i18n.translate(
  'xpack.securitySolution.guideConfig.alertsStep.manualCompletion.title',
  {
    defaultMessage: 'Continue the guide',
  }
);

export const CASES_MANUAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.guideConfig.alertsStep.manualCompletion.description',
  {
    defaultMessage: `After you've explored the case, continue.`,
  }
);
