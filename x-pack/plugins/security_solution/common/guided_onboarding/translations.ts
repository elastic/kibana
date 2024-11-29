/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.securitySolution.guideConfig.title', {
  defaultMessage: 'Detect threats in my data with Security Solution',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.guideConfig.description', {
  defaultMessage: `Welcome to Elastic Security for SIEM. In this guide, you'll learn how to analyze log and event data, set up threat detection, and respond to threats.`,
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
    defaultMessage: 'Send log and event data to Elastic',
  }
);

export const ADD_DATA_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.guideConfig.addDataStep.description',
  {
    defaultMessage:
      'Install an agent on one of your computers and configure it with the Elastic Defend integration. With this integration, the agent will be able to collect and send system data to Elastic Security in real time.',
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
    defaultMessage: `View the case's details by clicking View case in the confirmation message that appears. Alternatively, go to the Insights section of the alert details flyout, find the case you created, and select it. After you've explored the case, continue.`,
  }
);
