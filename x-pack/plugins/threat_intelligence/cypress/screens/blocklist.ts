/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_TO_BLOCK_LIST_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_BLOCK_LIST_TEST_ID } from '../../public/modules/indicators/components/flyout/test_ids';
import { ADD_TO_BLOCK_LIST_TEST_ID as INDICATORS_TABLE_ADD_TO_BLOCK_LIST_TEST_ID } from '../../public/modules/indicators/components/table/test_ids';

export const INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_ADD_TO_BLOCK_LIST_TEST_ID}"]`;
export const FLYOUT_ADD_TO_BLOCK_LIST_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_BLOCK_LIST_TEST_ID}"]`;
export const BLOCK_LIST_NAME = `[data-test-subj="blocklist-form-name-input"]`;
export const BLOCK_LIST_DESCRIPTION = `[data-test-subj="blocklist-form-description-input"]`;
export const BLOCK_LIST_ADD_BUTTON = `[class="eui-textTruncate"]`;
export const BLOCK_LIST_TOAST_LIST = `[data-test-subj="globalToastList"]`;
export const BLOCK_LIST_VALUE_INPUT = (iocId: string) =>
  `[data-test-subj="blocklist-form-values-input-${iocId}"]`;
export const SAVED_BLOCK_LIST_NAME = `[data-test-subj="blocklistPage-card-header-title"]`;
export const SAVED_BLOCK_LIST_DESCRIPTION = `[data-test-subj="blocklistPage-card-description"]`;
export const SAVED_BLOCK_LIST_ACTION_MENU = `[data-test-subj="blocklistPage-card-header-actions-button"]`;
export const SAVED_BLOCK_LIST_DELETE_BUTTON = `[data-test-subj="blocklistPage-card-cardDeleteAction"]`;
export const SAVED_BLOCK_LIST_CONFIRM_DELETE_BUTTON = `[data-test-subj="blocklistPage-deleteModal-submitButton"]`;
