/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ABOUT_DETAILS =
  '[data-test-subj="aboutRule"] [data-test-subj="listItemColumnStepRuleDescription"]';

export const DETAILS_DESCRIPTION = '.euiDescriptionList__description';

export const DETAILS_TITLE = '.euiDescriptionList__title';

export const ABOUT_INVESTIGATION_NOTES = '[data-test-subj="stepAboutDetailsNoteContent"]';

export const ABOUT_RULE_DESCRIPTION = '[data-test-subj=stepAboutRuleDetailsToggleDescriptionText]';

export const DEFINITION_DETAILS =
  '[data-test-subj=definitionRule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const INVESTIGATION_NOTES_MARKDOWN = 'test markdown';

export const INVESTIGATION_NOTES_TOGGLE = 1;

export const MACHINE_LEARNING_JOB_ID = '[data-test-subj="machineLearningJobId"]';

export const MACHINE_LEARNING_JOB_STATUS = '[data-test-subj="machineLearningJobStatus"]';

export const RULE_ABOUT_DETAILS_HEADER_TOGGLE = '[data-test-subj="stepAboutDetailsToggle"]';

export const RULE_NAME_HEADER = '[data-test-subj="header-page-title"]';

export const SCHEDULE_DETAILS =
  '[data-test-subj=schedule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const SCHEDULE_STEP = '[data-test-subj="schedule"]  .euiDescriptionList__description';

export const getDescriptionForTitle = (title: string) =>
  cy.get(DETAILS_TITLE).contains(title).next(DETAILS_DESCRIPTION);
