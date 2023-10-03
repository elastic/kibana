/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../shared/test_ids';
import { CONTENT_TEST_ID, HEADER_TEST_ID } from '../../right/components/expandable_section';

/* Rule preview */

const RULE_PREVIEW_TEST_ID = `${PREFIX}RulePreview` as const;
export const RULE_PREVIEW_TITLE_TEST_ID = `${RULE_PREVIEW_TEST_ID}RulePreviewTitle` as const;
export const RULE_PREVIEW_RULE_TITLE_SUPPRESSED_TEST_ID =
  `${RULE_PREVIEW_TITLE_TEST_ID}Suppressed` as const;
export const RULE_PREVIEW_RULE_CREATED_BY_TEST_ID = `${RULE_PREVIEW_TEST_ID}CreatedByText` as const;
export const RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID = `${RULE_PREVIEW_TEST_ID}UpdatedByText` as const;
export const RULE_PREVIEW_BODY_TEST_ID = `${RULE_PREVIEW_TEST_ID}Body` as const;
export const RULE_PREVIEW_ABOUT_TEST_ID = `${RULE_PREVIEW_TEST_ID}AboutSection` as const;
export const RULE_PREVIEW_ABOUT_HEADER_TEST_ID = RULE_PREVIEW_ABOUT_TEST_ID + HEADER_TEST_ID;
export const RULE_PREVIEW_ABOUT_CONTENT_TEST_ID = RULE_PREVIEW_ABOUT_TEST_ID + CONTENT_TEST_ID;
export const RULE_PREVIEW_DEFINITION_TEST_ID = `${RULE_PREVIEW_TEST_ID}DefinitionSection` as const;
export const RULE_PREVIEW_DEFINITION_HEADER_TEST_ID =
  RULE_PREVIEW_DEFINITION_TEST_ID + HEADER_TEST_ID;
export const RULE_PREVIEW_DEFINITION_CONTENT_TEST_ID =
  RULE_PREVIEW_DEFINITION_TEST_ID + CONTENT_TEST_ID;
export const RULE_PREVIEW_SCHEDULE_TEST_ID = `${RULE_PREVIEW_TEST_ID}ScheduleSection` as const;
export const RULE_PREVIEW_SCHEDULE_HEADER_TEST_ID = RULE_PREVIEW_SCHEDULE_TEST_ID + HEADER_TEST_ID;
export const RULE_PREVIEW_SCHEDULE_CONTENT_TEST_ID =
  RULE_PREVIEW_SCHEDULE_TEST_ID + CONTENT_TEST_ID;
export const RULE_PREVIEW_ACTIONS_TEST_ID = `${RULE_PREVIEW_TEST_ID}ActionsSection` as const;
export const RULE_PREVIEW_ACTIONS_HEADER_TEST_ID = RULE_PREVIEW_ACTIONS_TEST_ID + HEADER_TEST_ID;
export const RULE_PREVIEW_ACTIONS_CONTENT_TEST_ID = RULE_PREVIEW_ACTIONS_TEST_ID + CONTENT_TEST_ID;
export const RULE_PREVIEW_LOADING_TEST_ID = `${RULE_PREVIEW_TEST_ID}Loading` as const;
export const RULE_PREVIEW_FOOTER_TEST_ID = `${RULE_PREVIEW_TEST_ID}Footer` as const;
export const RULE_PREVIEW_NAVIGATE_TO_RULE_TEST_ID = 'goToRuleDetails' as const;
export const ALERT_REASON_PREVIEW_BODY_TEST_ID = `${PREFIX}AlertReasonPreviewBody` as const;
