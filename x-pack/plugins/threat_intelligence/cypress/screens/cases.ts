/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_TO_EXISTING_CASE_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_EXISTING_CASE_TEST_ID,
  ADD_TO_NEW_CASE_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_NEW_CASE_TEST_ID,
} from '../../public/modules/indicators/components/flyout/test_ids';
import {
  ADD_TO_EXISTING_TEST_ID as INDICATORS_TABLE_ADD_TO_EXISTING_TEST_ID,
  ADD_TO_NEW_CASE_TEST_ID as INDICATORS_TABLE_ADD_TO_NEW_CASE_TEST_ID,
} from '../../public/modules/indicators/components/table/test_ids';

export const INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_ADD_TO_NEW_CASE_TEST_ID}"]`;
export const INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_ADD_TO_EXISTING_TEST_ID}"]`;
export const FLYOUT_ADD_TO_EXISTING_CASE_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_EXISTING_CASE_TEST_ID}"]`;
export const FLYOUT_ADD_TO_NEW_CASE_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_NEW_CASE_TEST_ID}"]`;
export const CREATE_CASE_BUTTON = `[data-test-subj="createNewCaseBtn"]`;
export const SELECT_EXISTING_CASE = `[class="eui-textTruncate"]`;
export const VIEW_CASE_TOASTER_LINK = `[data-test-subj="toaster-content-case-view-link"]`;
export const CASE_COMMENT_EXTERNAL_REFERENCE = `[data-test-subj="comment-externalReference-indicator"]`;
export const CASE_ACTION_WRAPPER = `[data-test-subj="case-action-bar-wrapper"]`;
export const CASE_ELLIPSE_BUTTON = `[data-test-subj="property-actions-case-ellipses"]`;
export const CASE_ELLIPSE_DELETE_CASE_OPTION = `[data-test-subj="property-actions-case-trash"]`;
export const CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON = `[data-test-subj="confirmModalConfirmButton"]`;
export const NEW_CASE_NAME_INPUT = `[data-test-subj="input"][aria-describedby="caseTitle"]`;
export const NEW_CASE_DESCRIPTION_INPUT = `[data-test-subj="euiMarkdownEditorTextArea"]`;
export const NEW_CASE_CREATE_BUTTON = `[data-test-subj="create-case-submit"]`;
export const SELECT_CASE_TABLE_ROW = `.euiTableRow`;
export const SELECT_EXISTING_CASES_MODAL = `[data-test-subj="all-cases-modal"]`;
