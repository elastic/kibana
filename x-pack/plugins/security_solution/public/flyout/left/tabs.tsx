/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VisualizeTab } from './tabs/visualize_tab';
import { InvestigationTab } from './tabs/investigation_tab';
import { HISTORY_TAB, INSIGHTS_TAB, INVESTIGATIONS_TAB, VISUALIZE_TAB } from './translations';
import { InsightsTab } from './tabs/insights_tab';
import { HistoryTab } from './tabs/history_tab';
import type { LeftPanelPaths } from '.';
import {
  HISTORY_TAB_TEST_ID,
  INSIGHTS_TAB_TEST_ID,
  INVESTIGATIONS_TAB_TEST_ID,
  VISUALIZE_TAB_TEST_ID,
} from './test_ids';

export type LeftPanelTabsType = Array<{
  id: LeftPanelPaths;
  'data-test-subj': string;
  name: string;
  content: React.ReactElement;
}>;

export const tabs: LeftPanelTabsType = [
  {
    id: 'visualize',
    'data-test-subj': VISUALIZE_TAB_TEST_ID,
    name: VISUALIZE_TAB,
    content: <VisualizeTab />,
  },
  {
    id: 'insights',
    'data-test-subj': INSIGHTS_TAB_TEST_ID,
    name: INSIGHTS_TAB,
    content: <InsightsTab />,
  },
  {
    id: 'investigation',
    'data-test-subj': INVESTIGATIONS_TAB_TEST_ID,
    name: INVESTIGATIONS_TAB,
    content: <InvestigationTab />,
  },
  {
    id: 'history',
    'data-test-subj': HISTORY_TAB_TEST_ID,
    name: HISTORY_TAB,
    content: <HistoryTab />,
  },
];
