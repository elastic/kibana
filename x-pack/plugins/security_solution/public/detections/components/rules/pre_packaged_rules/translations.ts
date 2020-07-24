/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are met. By default, all prebuilt rules are disabled and you select which rules you want to activate.',
  }
);

export const PRE_BUILT_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.prePackagedRules.loadPreBuiltButton',
  {
    defaultMessage: 'Load prebuilt detection rules',
  }
);

export const CREATE_RULE_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.prePackagedRules.createOwnRuletButton',
  {
    defaultMessage: 'Create your own rules',
  }
);

export const UPDATE_PREPACKAGED_RULES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.updatePrePackagedRulesTitle',
  {
    defaultMessage: 'Update available for Elastic prebuilt rules or timeline templates',
  }
);

export const UPDATE_PREPACKAGED_RULES_MSG = (updateRules: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.updatePrePackagedRulesMsg', {
    values: { updateRules },
    defaultMessage:
      'You can update {updateRules} Elastic prebuilt {updateRules, plural, =1 {rule} other {rules}}',
  });

export const UPDATE_PREPACKAGED_TIMELINES_MSG = (updateTimelines: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.updatePrePackagedTimelinesMsg', {
    values: { updateTimelines },
    defaultMessage:
      'You can update {updateTimelines} Elastic prebuilt {updateTimelines, plural, =1 {timeline} other {timelines}}',
  });

export const UPDATE_PREPACKAGED_RULES_AND_TIMELINES_MSG = (
  updateRules: number,
  updateTimelines: number
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.updatePrePackagedRulesAndTimelinesMsg',
    {
      values: { updateRules, updateTimelines },
      defaultMessage:
        'You can update {updateRules} Elastic prebuilt {updateRules, plural, =1 {rule} other {rules}} and {updateTimelines} Elastic prebuilt {updateTimelines, plural, =1 {timeline} other {timelines}}. Note that this will reload deleted Elastic prebuilt rules.',
    }
  );

export const UPDATE_PREPACKAGED_RULES = (updateRules: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.updatePrePackagedRulesButton', {
    values: { updateRules },
    defaultMessage:
      'Update {updateRules} Elastic prebuilt {updateRules, plural, =1 {rule} other {rules}}',
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
