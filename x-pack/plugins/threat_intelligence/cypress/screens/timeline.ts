/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS,
  INDICATORS_FLYOUT_OVERVIEW_TABLE,
  INVESTIGATE_IN_TIMELINE_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_INVESTIGATE_IN_TIMELINE_TEST_ID,
  TIMELINE_BUTTON_TEST_ID as VALUE_ACTION_TIMELINE_BUTTON_TEST_ID,
} from '../../public/modules/indicators/components/flyout/test_ids';
import {
  INVESTIGATE_IN_TIMELINE_TEST_ID as CELL_INVESTIGATE_IN_TIMELINE_TEST_ID,
  TIMELINE_BUTTON_TEST_ID as CELL_TIMELINE_BUTTON_TEST_ID,
} from '../../public/modules/indicators/components/table/test_ids';

export const INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON = `[data-test-subj="${CELL_INVESTIGATE_IN_TIMELINE_TEST_ID}"]`;
export const UNTITLED_TIMELINE_BUTTON = `[data-test-subj="timeline-bottom-bar-title-button"]`;
export const INDICATORS_TABLE_CELL_TIMELINE_BUTTON = `[data-test-subj="${CELL_TIMELINE_BUTTON_TEST_ID}"] button`;
export const TIMELINE_DATA_PROVIDERS_WRAPPER = `[data-test-subj="dataProviders"]`;
export const TIMELINE_DRAGGABLE_ITEM = `[data-test-subj="providerContainer"]`;
export const TIMELINE_AND_OR_BADGE = `[data-test-subj="and-or-badge"]`;
export const CLOSE_TIMELINE_BTN = '[data-test-subj="timeline-modal-header-close-button"]';
export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_TIMELINE_BUTTON_TEST_ID}"]`;
export const FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_TIMELINE_BUTTON_TEST_ID}"]`;
export const FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_INVESTIGATE_IN_TIMELINE_TEST_ID}"]`;
