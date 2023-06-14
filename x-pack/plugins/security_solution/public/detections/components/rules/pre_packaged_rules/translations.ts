/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PRE_BUILT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.prePackagedRules.emptyPromptTitle',
  {
    defaultMessage: 'Load Elastic prebuilt detection rules',
  }
);

export const PRE_BUILT_MSG = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.prePackagedRules.emptyPromptMessage',
  {
    defaultMessage:
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are met. By default, all prebuilt rules except the Endpoint Security rule are disabled. You can select additional rules you want to enable.',
  }
);

export const CREATE_RULE_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.prePackagedRules.createOwnRuletButton',
  {
    defaultMessage: 'Create your own rules',
  }
);
export const RULE_UPDATES_LINK = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.ruleUpdatesLinkTitle',
  {
    defaultMessage: 'Rule Updates',
  }
);

export const ADD_ELASTIC_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.addElasticRulesButtonTitle',
  {
    defaultMessage: 'Add Elastic rules',
  }
);

export const DISMISS = i18n.translate('xpack.securitySolution.detectionEngine.rules.dismissTitle', {
  defaultMessage: 'Dismiss',
});

export const UPDATE_PREPACKAGED_TIMELINES = (updateTimelines: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.updatePrePackagedTimelinesButton', {
    values: { updateTimelines },
    defaultMessage:
      'Update {updateTimelines} Elastic prebuilt {updateTimelines, plural, =1 {timeline} other {timelines}}',
  });

export const UPDATE_PREPACKAGED_RULES_AND_TIMELINES = (
  updateRules: number,
  updateTimelines: number
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.updatePrePackagedRulesAndTimelinesButton',
    {
      values: { updateRules, updateTimelines },
      defaultMessage:
        'Update {updateRules} Elastic prebuilt {updateRules, plural, =1 {rule} other {rules}} and {updateTimelines} Elastic prebuilt {updateTimelines, plural, =1 {timeline} other {timelines}}',
    }
  );

export const RELEASE_NOTES_HELP = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.releaseNotesHelp',
  {
    defaultMessage: 'Release notes',
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
