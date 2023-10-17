/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { VisualizeTab } from './tabs/visualize_tab';
import { InvestigationTab } from './tabs/investigation_tab';
import { InsightsTab } from './tabs/insights_tab';
import type { LeftPanelPaths } from '.';
import {
  INSIGHTS_TAB_TEST_ID,
  INVESTIGATION_TAB_TEST_ID,
  RESPONSE_TAB_TEST_ID,
  VISUALIZE_TAB_TEST_ID,
} from './test_ids';
import { ResponseTab } from './tabs/response_tab';

export type LeftPanelTabsType = Array<{
  id: LeftPanelPaths;
  'data-test-subj': string;
  name: ReactElement;
  content: React.ReactElement;
  visible: boolean;
}>;

export const tabs: LeftPanelTabsType = [
  {
    id: 'visualize',
    'data-test-subj': VISUALIZE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualize.tabLabel"
        defaultMessage="Visualize"
      />
    ),
    content: <VisualizeTab />,
    visible: false,
  },
  {
    id: 'insights',
    'data-test-subj': INSIGHTS_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.tabLabel"
        defaultMessage="Insights"
      />
    ),
    content: <InsightsTab />,
    visible: true,
  },
  {
    id: 'investigation',
    'data-test-subj': INVESTIGATION_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.investigations.tabLabel"
        defaultMessage="Investigation"
      />
    ),
    content: <InvestigationTab />,
    visible: true,
  },
  {
    id: 'response',
    'data-test-subj': RESPONSE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.response.tabLabel"
        defaultMessage="Response"
      />
    ),
    content: <ResponseTab />,
    visible: true,
  },
];
