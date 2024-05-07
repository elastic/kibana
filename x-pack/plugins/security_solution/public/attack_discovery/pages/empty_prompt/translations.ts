/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_WILL_BE_ANALYZED = (alertsCount: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.pages.emptyPrompt.alertsWillBeAnalyzedTitle',
    {
      defaultMessage: '{alertsCount, plural, one {alert} other {alerts}} will be analyzed',
      values: { alertsCount },
    }
  );

export const GENERATE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.emptyPrompt.generateLabel',
  {
    defaultMessage: 'Generate',
  }
);

export const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.emptyPrompt.learnMoreLabel',
  {
    defaultMessage: 'Learn more',
  }
);

export const RESPONSES_FROM_AI_SYSTEMS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.emptyPrompt.responsesFromAiSystemsTooltip',
  {
    defaultMessage:
      'Responses from AI systems may not always be entirely accurate, although they can seem convincing. For more information on the Attack Discovery feature and its usage, please reference the documentation.',
  }
);

export const SELECT_A_CONNECTOR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.emptyPrompt.selectAConnectorLabel',
  {
    defaultMessage: 'Select a connector',
  }
);

export const START_GENERATING_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.emptyPrompt.startGeneratingDiscoveriesLabel',
  {
    defaultMessage: 'Start discovering attacks with the power of AI and Elastic Security.',
  }
);

export const UP_TO = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.emptyPrompt.upToTitle',
  {
    defaultMessage: 'Up to',
  }
);
