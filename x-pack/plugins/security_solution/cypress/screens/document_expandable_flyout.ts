/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANALYZER_GRAPH_TEST_ID,
  SESSION_VIEW_TEST_ID,
} from '../../public/flyout/left/components/test_ids';
import {
  HISTORY_TAB_CONTENT_TEST_ID,
  INSIGHTS_TAB_CONTENT_TEST_ID,
  INVESTIGATIONS_TAB_CONTENT_TEST_ID,
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID,
  VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
} from '../../public/flyout/left/tabs/test_ids';
import {
  HISTORY_TAB_TEST_ID,
  INSIGHTS_TAB_TEST_ID,
  INVESTIGATIONS_TAB_TEST_ID,
  VISUALIZE_TAB_TEST_ID,
} from '../../public/flyout/left/test_ids';
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
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  FLYOUT_HEADER_TITLE_TEST_ID,
  MITRE_ATTACK_DETAILS_TEST_ID,
  MITRE_ATTACK_TITLE_TEST_ID,
} from '../../public/flyout/right/components/test_ids';
import { getDataTestSubjectSelector } from '../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE = getDataTestSubjectSelector(
  FLYOUT_HEADER_TITLE_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON = getDataTestSubjectSelector(
  EXPAND_DETAILS_BUTTON_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON = getDataTestSubjectSelector(
  COLLAPSE_DETAILS_BUTTON_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB =
  getDataTestSubjectSelector(OVERVIEW_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB = getDataTestSubjectSelector(TABLE_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_JSON_TAB = getDataTestSubjectSelector(JSON_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_CONTENT = getDataTestSubjectSelector(
  OVERVIEW_TAB_CONTENT_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CONTENT =
  getDataTestSubjectSelector(TABLE_TAB_CONTENT_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT =
  getDataTestSubjectSelector(JSON_TAB_CONTENT_TEST_ID);

export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB =
  getDataTestSubjectSelector(VISUALIZE_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB =
  getDataTestSubjectSelector(INSIGHTS_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB = getDataTestSubjectSelector(
  INVESTIGATIONS_TAB_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB = getDataTestSubjectSelector(HISTORY_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_BUTTON_GROUP = getDataTestSubjectSelector(
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON = getDataTestSubjectSelector(
  VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_CONTENT =
  getDataTestSubjectSelector(SESSION_VIEW_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON =
  getDataTestSubjectSelector(VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT =
  getDataTestSubjectSelector(ANALYZER_GRAPH_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CONTENT = getDataTestSubjectSelector(
  INSIGHTS_TAB_CONTENT_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB_CONTENT = getDataTestSubjectSelector(
  INVESTIGATIONS_TAB_CONTENT_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB_CONTENT = getDataTestSubjectSelector(
  HISTORY_TAB_CONTENT_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE = getDataTestSubjectSelector(
  MITRE_ATTACK_TITLE_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS = getDataTestSubjectSelector(
  MITRE_ATTACK_DETAILS_TEST_ID
);
