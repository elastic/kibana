/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../shared/test_ids';
import { CONTENT_TEST_ID, HEADER_TEST_ID } from '../../right/components/expandable_section';

const RULE_OVERVIEW_TEST_ID = `${PREFIX}RuleOverview` as const;
export const RULE_OVERVIEW_TITLE_TEST_ID = `${RULE_OVERVIEW_TEST_ID}RuleOverviewTitle` as const;
export const RULE_OVERVIEW_RULE_TITLE_SUPPRESSED_TEST_ID =
  `${RULE_OVERVIEW_TITLE_TEST_ID}Suppressed` as const;
export const RULE_OVERVIEW_RULE_CREATED_BY_TEST_ID =
  `${RULE_OVERVIEW_TEST_ID}CreatedByText` as const;
export const RULE_OVERVIEW_RULE_UPDATED_BY_TEST_ID =
  `${RULE_OVERVIEW_TEST_ID}UpdatedByText` as const;
export const RULE_OVERVIEW_BODY_TEST_ID = `${RULE_OVERVIEW_TEST_ID}Body` as const;

export const RULE_OVERVIEW_ABOUT_TEST_ID = `${RULE_OVERVIEW_TEST_ID}AboutSection` as const;
export const RULE_OVERVIEW_ABOUT_HEADER_TEST_ID = RULE_OVERVIEW_ABOUT_TEST_ID + HEADER_TEST_ID;
export const RULE_OVERVIEW_ABOUT_CONTENT_TEST_ID = RULE_OVERVIEW_ABOUT_TEST_ID + CONTENT_TEST_ID;

export const RULE_OVERVIEW_DEFINITION_TEST_ID =
  `${RULE_OVERVIEW_TEST_ID}DefinitionSection` as const;
export const RULE_OVERVIEW_DEFINITION_HEADER_TEST_ID =
  RULE_OVERVIEW_DEFINITION_TEST_ID + HEADER_TEST_ID;
export const RULE_OVERVIEW_DEFINITION_CONTENT_TEST_ID =
  RULE_OVERVIEW_DEFINITION_TEST_ID + CONTENT_TEST_ID;

export const RULE_OVERVIEW_SCHEDULE_TEST_ID = `${RULE_OVERVIEW_TEST_ID}ScheduleSection` as const;
export const RULE_OVERVIEW_SCHEDULE_HEADER_TEST_ID =
  RULE_OVERVIEW_SCHEDULE_TEST_ID + HEADER_TEST_ID;
export const RULE_OVERVIEW_SCHEDULE_CONTENT_TEST_ID =
  RULE_OVERVIEW_SCHEDULE_TEST_ID + CONTENT_TEST_ID;

export const RULE_OVERVIEW_ACTIONS_TEST_ID = `${RULE_OVERVIEW_TEST_ID}ActionsSection` as const;
export const RULE_OVERVIEW_ACTIONS_HEADER_TEST_ID = RULE_OVERVIEW_ACTIONS_TEST_ID + HEADER_TEST_ID;
export const RULE_OVERVIEW_ACTIONS_CONTENT_TEST_ID =
  RULE_OVERVIEW_ACTIONS_TEST_ID + CONTENT_TEST_ID;

export const RULE_OVERVIEW_LOADING_TEST_ID = `${RULE_OVERVIEW_TEST_ID}Loading` as const;
export const RULE_OVERVIEW_FOOTER_TEST_ID = `${RULE_OVERVIEW_TEST_ID}Footer` as const;
export const RULE_OVERVIEW_NAVIGATE_TO_RULE_TEST_ID =
  `${RULE_OVERVIEW_FOOTER_TEST_ID}LinkToRuleDetails` as const;
