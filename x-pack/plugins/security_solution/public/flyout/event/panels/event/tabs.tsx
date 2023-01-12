/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EventPanelPaths } from '../../../../common/store/flyout/model';
import * as i18n from './translations';
import { EventTableTab } from '../table';
import { EventJSONTab } from '../json';
import { EventOverviewTab } from '../overview';

// See: x-pack/plugins/security_solution/public/common/components/event_details/event_details.tsx

export type EventTabsType = Array<{
  id: EventPanelPaths;
  'data-test-subj': string;
  name: string;
  content: React.ReactElement;
}>;

export const eventTabs: EventTabsType = [
  {
    id: 'overview',
    'data-test-subj': 'overviewTab',
    name: i18n.OVERVIEW_TAB,
    content: <EventOverviewTab />,
  },
  {
    id: 'table',
    'data-test-subj': 'tableTab',
    name: i18n.TABLE_TAB,
    content: <EventTableTab />,
  },
  {
    id: 'json',
    'data-test-subj': 'jsonViewTab',
    name: i18n.JSON_TAB,
    content: <EventJSONTab />,
  },
];

export const eventTabIds = eventTabs.map((tab) => tab.id);
