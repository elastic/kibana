/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TOUR_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.featureTour.tourTitle',
  {
    defaultMessage: "What's new",
  }
);

export const PREVIOUS_STEP_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.featureTour.previousStepLabel',
  {
    defaultMessage: 'Go to previous step',
  }
);

export const NEXT_STEP_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.featureTour.nextStepLabel',
  {
    defaultMessage: 'Go to next step',
  }
);

export const SEARCH_CAPABILITIES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.featureTour.searchCapabilitiesTitle',
  {
    defaultMessage: 'Enhanced search capabilities',
  }
);

export const SEARCH_CAPABILITIES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.featureTour.searchCapabilitiesDescription',
  {
    defaultMessage:
      'It is now possible to search rules by index patterns, like "filebeat-*", or by MITRE ATT&CK™ tactics or techniques, like "Defense Evasion" or "TA0005".',
  }
);
