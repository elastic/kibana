/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ADVANCED_SETTINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.advancedSettingsButton',
  {
    defaultMessage: 'Advanced settings',
  }
);

export const ADD_REFERENCE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.addReferenceDescription',
  {
    defaultMessage: 'Add reference URL',
  }
);

export const ADD_FALSE_POSITIVE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.addFalsePositiveDescription',
  {
    defaultMessage: 'Add false positive example',
  }
);

export const LOW = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionLowDescription',
  {
    defaultMessage: 'Low',
  }
);

export const MEDIUM = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionMediumDescription',
  {
    defaultMessage: 'Medium',
  }
);

export const HIGH = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionHighDescription',
  {
    defaultMessage: 'High',
  }
);

export const CRITICAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionCriticalDescription',
  {
    defaultMessage: 'Critical',
  }
);

export const CUSTOM_MITRE_ATTACK_TECHNIQUES_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customMitreAttackTechniquesFieldRequiredError',
  {
    defaultMessage: 'At least one Technique is required with a Tactic.',
  }
);

export const URL_FORMAT_INVALID = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.referencesUrlInvalidError',
  {
    defaultMessage: 'Url is invalid format',
  }
);

export const ADD_RULE_NOTE_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutrule.noteHelpText',
  {
    defaultMessage: 'Add rule investigation guide...',
  }
);
