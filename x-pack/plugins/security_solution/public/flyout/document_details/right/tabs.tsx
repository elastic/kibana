/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
import type { RightPanelPaths } from '.';
import { JsonTab } from './tabs/json_tab';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from './tabs/table_tab';

export type RightPanelTabsType = Array<{
  id: RightPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}>;

/**
 * Tabs to display in the document details expandable flyout right section
 */
export const tabs: RightPanelTabsType = [
  {
    id: 'overview',
    'data-test-subj': OVERVIEW_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.header.overviewTabLabel"
        defaultMessage="Overview"
      />
    ),
    content: <OverviewTab />,
  },
  {
    id: 'table',
    'data-test-subj': TABLE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.header.tableTabLabel"
        defaultMessage="Table"
      />
    ),
    content: <TableTab />,
  },
  {
    id: 'json',
    'data-test-subj': JSON_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.header.jsonTabLabel"
        defaultMessage="JSON"
      />
    ),
    content: <JsonTab />,
  },
];
