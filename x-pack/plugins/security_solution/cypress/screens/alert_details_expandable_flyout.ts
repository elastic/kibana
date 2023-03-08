/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  JSON_TAB_TEST_ID,
  OVERVIEW_TAB_TEST_ID,
  TABLE_TAB_TEST_ID,
} from '../../public/flyout/right/test_ids';
import {
  JSON_TAB_CONTENT_TEST_ID,
  OVERVIEW_TAB_CONTENT_TEST_ID,
  TABLE_TAB_CONTENT_TEST_ID,
} from '../../public/flyout/right/tabs/test_ids';
import { FLYOUT_HEADER_TITLE } from '../../public/flyout/right/components/test_ids';

export const ALERT_DETAILS_FLYOUT_HEADER_TITLE = `[data-test-subj="${FLYOUT_HEADER_TITLE}"]`;
export const ALERT_DETAILS_FLYOUT_OVERVIEW_TAB = `[data-test-subj="${OVERVIEW_TAB_TEST_ID}"]`;
export const ALERT_DETAILS_FLYOUT_TABLE_TAB = `[data-test-subj="${TABLE_TAB_TEST_ID}"]`;
export const ALERT_DETAILS_FLYOUT_JSON_TAB = `[data-test-subj="${JSON_TAB_TEST_ID}"]`;
export const ALERT_DETAILS_FLYOUT_OVERVIEW_TAB_CONTENT = `[data-test-subj="${OVERVIEW_TAB_CONTENT_TEST_ID}"]`;
export const ALERT_DETAILS_FLYOUT_TABLE_TAB_CONTENT = `[data-test-subj="${TABLE_TAB_CONTENT_TEST_ID}"]`;
export const ALERT_DETAILS_FLYOUT_JSON_TAB_CONTENT = `[data-test-subj="${JSON_TAB_CONTENT_TEST_ID}"]`;
