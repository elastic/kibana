/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const RULE_AND_TIMELINE_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.rulesAndTimelines',
  {
    defaultMessage: 'Failed to fetch Rules and Timelines',
  }
);

export const RULE_ADD_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.addRuleFailDescription',
  {
    defaultMessage: 'Failed to add Rule',
  }
);

export const RULE_AND_TIMELINE_PREPACKAGED_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.createPrePackagedRuleAndTimelineFailDescription',
  {
    defaultMessage: 'Failed to installed pre-packaged rules and timelines from elastic',
  }
);

export const RULE_AND_TIMELINE_PREPACKAGED_SUCCESS = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.createPrePackagedRuleAndTimelineSuccesDescription',
  {
    defaultMessage: 'Installed pre-packaged rules and timelines from elastic',
  }
);

export const TAG_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.tagFetchFailDescription',
  {
    defaultMessage: 'Failed to fetch Tags',
  }
);
