/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { findIndex } from 'lodash';
import React from 'react';

import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

import chrome from 'ui/chrome';

import { UpgradeAssistantStatus } from '../../server/lib/es_migration_apis';
import { LatestMinorBanner } from './latest_minor_banner';
import { CheckupTab } from './tabs/checkup';
import { OverviewTab } from './tabs/overview';
import { LoadingState, UpgradeAssistantTabProps } from './types';

interface TabsState {
  loadingState: LoadingState;
  checkupData?: UpgradeAssistantStatus;
  selectedTabIndex: number;
}

export class UpgradeAssistantTabsUI extends React.Component<
  ReactIntl.InjectedIntlProps,
  TabsState
> {
  constructor(props: ReactIntl.InjectedIntlProps) {
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

  private onTabClick = (selectedTab: EuiTabbedContentTab) => {
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
      const resp = await axios.get(chrome.addBasePath('/api/upgrade_assistant/status'));
      this.setState({
        loadingState: LoadingState.Success,
        checkupData: resp.data,
      });
    } catch (e) {
      this.setState({ loadingState: LoadingState.Error });
    }
  };

  private get tabs() {
    const { intl } = this.props;
    const { loadingState, checkupData } = this.state;
    const commonProps: UpgradeAssistantTabProps = {
      loadingState,
      refreshCheckupData: this.loadData,
      setSelectedTabIndex: this.setSelectedTabIndex,
      // Remove this in last minor of the current major (eg. 6.7)
      alertBanner: <LatestMinorBanner />,
    };

    return [
      {
        id: 'overview',
        name: intl.formatMessage({
          id: 'xpack.upgradeAssistant.overviewTab.overviewTabTitle',
          defaultMessage: 'Overview',
        }),
        content: <OverviewTab checkupData={checkupData} {...commonProps} />,
      },
      {
        id: 'cluster',
        name: intl.formatMessage({
          id: 'xpack.upgradeAssistant.checkupTab.clusterTabLabel',
          defaultMessage: 'Cluster',
        }),
        content: (
          <CheckupTab
            key="cluster"
            deprecations={checkupData ? checkupData.cluster : undefined}
            checkupLabel={intl.formatMessage({
              id: 'xpack.upgradeAssistant.tabs.checkupTab.clusterLabel',
              defaultMessage: 'cluster',
            })}
            {...commonProps}
          />
        ),
      },
      {
        id: 'indices',
        name: intl.formatMessage({
          id: 'xpack.upgradeAssistant.checkupTab.indicesTabLabel',
          defaultMessage: 'Indices',
        }),
        content: (
          <CheckupTab
            key="indices"
            deprecations={checkupData ? checkupData.indices : undefined}
            checkupLabel={intl.formatMessage({
              id: 'xpack.upgradeAssistant.checkupTab.indexLabel',
              defaultMessage: 'index',
            })}
            showBackupWarning
            {...commonProps}
          />
        ),
      },
    ];
  }
}

export const UpgradeAssistantTabs = injectI18n(UpgradeAssistantTabsUI);
