/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ALL_ACTIONS = '[data-test-subj="rules-details-popover-button-icon"]';

export const ABOUT_INVESTIGATION_NOTES = '[data-test-subj="stepAboutDetailsNoteContent"]';

export const ABOUT_RULE_DESCRIPTION = '[data-test-subj=stepAboutRuleDetailsToggleDescriptionText]';

export const ABOUT_DETAILS =
  '[data-test-subj="aboutRule"] [data-test-subj="listItemColumnStepRuleDescription"]';

export const ADDITIONAL_LOOK_BACK_DETAILS = 'Additional look-back time';

export const ANOMALY_SCORE_DETAILS = 'Anomaly score';

export const CUSTOM_QUERY_DETAILS = 'Custom query';

export const DEFINITION_DETAILS =
  '[data-test-subj=definitionRule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const DETAILS_DESCRIPTION = '.euiDescriptionList__description';

export const DETAILS_TITLE = '.euiDescriptionList__title';

export const DELETE_RULE = '[data-test-subj=rules-details-delete-rule]';

export const FALSE_POSITIVES_DETAILS = 'False positive examples';

export const INDEX_PATTERNS_DETAILS = 'Index patterns';

export const INVESTIGATION_NOTES_MARKDOWN = 'test markdown';

export const INVESTIGATION_NOTES_TOGGLE = '[data-test-subj="stepAboutDetailsToggle-notes"]';

export const MACHINE_LEARNING_JOB_ID = '[data-test-subj="machineLearningJobId"]';

export const MACHINE_LEARNING_JOB_STATUS = '[data-test-subj="machineLearningJobStatus"]';

export const MITRE_ATTACK_DETAILS = 'MITRE ATT&CK';

export const RULE_ABOUT_DETAILS_HEADER_TOGGLE = '[data-test-subj="stepAboutDetailsToggle"]';

export const RULE_NAME_HEADER = '[data-test-subj="header-page-title"]';

export const RULE_NAME_OVERRIDE_DETAILS = 'Rule name override';

export const RISK_SCORE_DETAILS = 'Risk score';

export const RISK_SCORE_OVERRIDE_DETAILS = 'Risk score override';

export const REFERENCE_URLS_DETAILS = 'Reference URLs';

export const RULE_TYPE_DETAILS = 'Rule type';

export const RUNS_EVERY_DETAILS = 'Runs every';

export const SCHEDULE_DETAILS =
  '[data-test-subj=schedule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const SCHEDULE_STEP = '[data-test-subj="schedule"]  .euiDescriptionList__description';

export const SEVERITY_DETAILS = 'Severity';

export const TAGS_DETAILS = 'Tags';

export const THRESHOLD_DETAILS = 'Threshold';

export const TIMELINE_TEMPLATE_DETAILS = 'Timeline template';

export const TIMESTAMP_OVERRIDE_DETAILS = 'Timestamp override';

export const getDetails = (title: string) =>
  cy.get(DETAILS_TITLE).contains(title).next(DETAILS_DESCRIPTION);
