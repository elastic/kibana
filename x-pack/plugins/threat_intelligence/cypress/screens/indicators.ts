/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TABLE_TEST_ID as FLYOUT_TABLE_TEST_ID } from '../../public/modules/indicators/components/indicators_flyout_table/indicators_flyout_table';
import { CODE_BLOCK_TEST_ID } from '../../public/modules/indicators/components/indicators_flyout_json/indicators_flyout_json';
import { TABS_TEST_ID } from '../../public/modules/indicators/components/indicators_flyout/indicators_flyout';
import { BUTTON_TEST_ID } from '../../public/modules/indicators/components/open_indicator_flyout_button/open_indicator_flyout_button';
import { TABLE_TEST_ID as INDICATORS_TABLE_TEST_ID } from '../../public/modules/indicators/components/indicators_table/indicators_table';
import { TITLE_TEST_ID as LAYOUT_TITLE_TEST_ID } from '../../public/components/layout';
import { TITLE_TEST_ID as FLYOUT_TITLE_TEST_ID } from '../../public/modules/indicators/components/indicators_flyout/indicators_flyout';

export const DEFAULT_LAYOUT_TITLE = `[data-test-subj="${LAYOUT_TITLE_TEST_ID}"]`;

export const INDICATORS_TABLE = `[data-test-subj="${INDICATORS_TABLE_TEST_ID}"]`;

export const TOGGLE_FLYOUT_BUTTON = `[data-test-subj="${BUTTON_TEST_ID}"]`;

export const FLYOUT_TITLE = `[data-test-subj="${FLYOUT_TITLE_TEST_ID}"]`;

export const FLYOUT_TABS = `[data-test-subj="${TABS_TEST_ID}"]`;

export const FLYOUT_TABLE = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}"]`;

export const FLYOUT_JSON = `[data-test-subj="${CODE_BLOCK_TEST_ID}"]`;
