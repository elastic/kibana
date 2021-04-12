/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    defaultMessage: 'Installed pre-packaged rules and timeline templates from elastic',
  }
);

export const RULE_PREPACKAGED_SUCCESS = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.createPrePackagedRuleSuccesDescription',
  {
    defaultMessage: 'Installed pre-packaged rules from elastic',
  }
);

export const TIMELINE_PREPACKAGED_SUCCESS = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.createPrePackagedTimelineSuccesDescription',
  {
    defaultMessage: 'Installed pre-packaged timeline templates from elastic',
  }
);

export const TAG_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.tagFetchFailDescription',
  {
    defaultMessage: 'Failed to fetch Tags',
  }
);

export const LOAD_PREPACKAGED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.loadPrePackagedRulesButton',
  {
    defaultMessage: 'Load Elastic prebuilt rules',
  }
);

export const LOAD_PREPACKAGED_TIMELINE_TEMPLATES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.loadPrePackagedTimelineTemplatesButton',
  {
    defaultMessage: 'Load Elastic prebuilt timeline templates',
  }
);

export const LOAD_PREPACKAGED_RULES_AND_TEMPLATES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.loadPrePackagedRulesAndTemplatesButton',
  {
    defaultMessage: 'Load Elastic prebuilt rules and timeline templates',
  }
);

export const RELOAD_MISSING_PREPACKAGED_RULES = (missingRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.reloadMissingPrePackagedRulesButton',
    {
      values: { missingRules },
      defaultMessage:
        'Install {missingRules} Elastic prebuilt {missingRules, plural, =1 {rule} other {rules}} ',
    }
  );

export const RELOAD_MISSING_PREPACKAGED_TIMELINES = (missingTimelines: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.reloadMissingPrePackagedTimelinesButton',
    {
      values: { missingTimelines },
      defaultMessage:
        'Install {missingTimelines} Elastic prebuilt {missingTimelines, plural, =1 {timeline} other {timelines}} ',
    }
  );

export const RELOAD_MISSING_PREPACKAGED_RULES_AND_TIMELINES = (
  missingRules: number,
  missingTimelines: number
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.reloadMissingPrePackagedRulesAndTimelinesButton',
    {
      values: { missingRules, missingTimelines },
      defaultMessage:
        'Install {missingRules} Elastic prebuilt {missingRules, plural, =1 {rule} other {rules}} and {missingTimelines} Elastic prebuilt {missingTimelines, plural, =1 {timeline} other {timelines}} ',
    }
  );
