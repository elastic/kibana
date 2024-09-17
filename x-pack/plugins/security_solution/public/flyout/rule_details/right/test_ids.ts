/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../shared/test_ids';
import {
  CONTENT_TEST_ID,
  HEADER_TEST_ID,
} from '../../document_details/right/components/expandable_section';

const RULE_PANEL_TEST_ID = `${PREFIX}RulePanel` as const;
export const RULE_TITLE_TEST_ID = `${RULE_PANEL_TEST_ID}Title` as const;
export const NAVIGATE_TO_RULE_DETAILS_PAGE_TEST_ID =
  `${RULE_PANEL_TEST_ID}LinkToRuleDetailsPage` as const;

export const RULE_TITLE_SUPPRESSED_TEST_ID = `${RULE_TITLE_TEST_ID}Suppressed` as const;
export const RULE_CREATED_BY_TEST_ID = `${RULE_PANEL_TEST_ID}CreatedByText` as const;
export const RULE_UPDATED_BY_TEST_ID = `${RULE_PANEL_TEST_ID}UpdatedByText` as const;
export const BODY_TEST_ID = `${RULE_PANEL_TEST_ID}Body` as const;

export const ABOUT_TEST_ID = `${RULE_PANEL_TEST_ID}AboutSection` as const;
export const ABOUT_HEADER_TEST_ID = ABOUT_TEST_ID + HEADER_TEST_ID;
export const ABOUT_CONTENT_TEST_ID = ABOUT_TEST_ID + CONTENT_TEST_ID;

export const DEFINITION_TEST_ID = `${RULE_PANEL_TEST_ID}DefinitionSection` as const;
export const DEFINITION_HEADER_TEST_ID = DEFINITION_TEST_ID + HEADER_TEST_ID;
export const DEFINITION_CONTENT_TEST_ID = DEFINITION_TEST_ID + CONTENT_TEST_ID;

export const SCHEDULE_TEST_ID = `${RULE_PANEL_TEST_ID}ScheduleSection` as const;
export const SCHEDULE_HEADER_TEST_ID = SCHEDULE_TEST_ID + HEADER_TEST_ID;
export const SCHEDULE_CONTENT_TEST_ID = SCHEDULE_TEST_ID + CONTENT_TEST_ID;

export const ACTIONS_TEST_ID = `${RULE_PANEL_TEST_ID}ActionsSection` as const;
export const ACTIONS_HEADER_TEST_ID = ACTIONS_TEST_ID + HEADER_TEST_ID;
export const ACTIONS_CONTENT_TEST_ID = ACTIONS_TEST_ID + CONTENT_TEST_ID;

export const LOADING_TEST_ID = `${RULE_PANEL_TEST_ID}Loading` as const;
