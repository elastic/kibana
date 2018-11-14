/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  // @ts-ignore
  EuiTabbedContent,
} from '@elastic/eui';

import { CheckupTab } from './tabs/checkup';
import { OverviewTab } from './tabs/overview';

// TODO: replace with types added in https://github.com/elastic/eui/pull/1288
interface EuiTab {
  id: string;
  name: string;
  content: React.ReactElement<any>;
}

export class UpgradeCheckupTabs extends React.Component {
  private tabs: EuiTab[] = [
    {
      id: 'overview',
      name: 'Overview',
      content: <OverviewTab />,
    },
    {
      id: 'cluster',
      name: 'Cluster',
      content: <CheckupTab key="cluster" checkupType="cluster" />,
    },
    // {
    //   id: 'nodes',
    //   name: 'Nodes',
    //   content: <CheckupTab key="nodes" checkupType="nodes" />,
    // },
    {
      id: 'indices',
      name: 'Indices',
      content: <CheckupTab key="indices" checkupType="indices" />,
    },
  ];

  public render() {
    return <EuiTabbedContent tabs={this.tabs} initialSelectedTab={this.tabs[0]} />;
  }
}
