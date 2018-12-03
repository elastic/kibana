/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { findIndex } from 'lodash';
import React from 'react';

import {
  // @ts-ignore
  EuiTabbedContent,
} from '@elastic/eui';

import chrome from 'ui/chrome';

import { UpgradeCheckupStatus } from '../../server/lib/es_migration_apis';
import { CheckupTab } from './tabs/checkup';
import { OverviewTab } from './tabs/overview';
import { LoadingState, UpgradeCheckupTabProps } from './types';

// TODO: replace with types added in https://github.com/elastic/eui/pull/1288
interface EuiTab {
  id: string;
  name: string;
  content: React.ReactElement<any>;
}

interface TabsState {
  loadingState: LoadingState;
  checkupData?: UpgradeCheckupStatus;
  selectedTabIndex: number;
}

export class UpgradeCheckupTabs extends React.Component<{}, TabsState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      loadingState: LoadingState.Loading,
      selectedTabIndex: 0,
    };
  }

  public componentDidMount() {
    this.loadData();
  }

  public render() {
    const { selectedTabIndex } = this.state;
    const tabs = this.tabs;

    return (
      <EuiTabbedContent
        tabs={tabs}
        onTabClick={this.onTabClick}
        selectedTab={tabs[selectedTabIndex]}
      />
    );
  }

  private onTabClick = (selectedTab: EuiTab) => {
    const selectedTabIndex = findIndex(this.tabs, { id: selectedTab.id });
    if (selectedTabIndex === -1) {
      throw new Error(`Clicked tab did not exist in tabs array`);
    }

    this.setSelectedTabIndex(selectedTabIndex);
  };

  private setSelectedTabIndex = (selectedTabIndex: number) => {
    this.setState({ selectedTabIndex });
  };

  private loadData = async () => {
    try {
      this.setState({ loadingState: LoadingState.Loading });
      const resp = await axios.get(chrome.addBasePath('/api/upgrade_checkup/status'));
      this.setState({
        loadingState: LoadingState.Success,
        checkupData: resp.data,
      });
    } catch (e) {
      // TODO: show error message?
      this.setState({ loadingState: LoadingState.Error });
    }
  };

  private get tabs() {
    const commonProps: UpgradeCheckupTabProps = {
      loadingState: this.state.loadingState,
      checkupData: this.state.checkupData,
      refreshCheckupData: this.loadData,
      setSelectedTabIndex: this.setSelectedTabIndex,
    };

    return [
      {
        id: 'overview',
        name: 'Overview',
        content: <OverviewTab {...commonProps} />,
      },
      {
        id: 'cluster',
        name: 'Cluster',
        content: <CheckupTab key="cluster" checkupType="cluster" {...commonProps} />,
      },
      {
        id: 'indices',
        name: 'Indices',
        content: <CheckupTab key="indices" checkupType="indices" {...commonProps} />,
      },
    ];
  }
}
