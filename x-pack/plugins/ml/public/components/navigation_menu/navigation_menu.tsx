/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { TopNav } from './top_nav';

interface Tab {
  id: string;
  name: any;
  disabled: boolean;
}

interface Props {
  disableLinks: boolean;
  tabId: string;
  timefilter: any;
  timeHistory: any;
}

function moveToSelectedTab(selectedTabId: string) {
  window.location.href = `${chrome.getBasePath()}/app/ml#/${selectedTabId}`;
}

function getTabs(disableLinks: boolean): Tab[] {
  return [
    {
      id: 'jobs',
      name: i18n.translate('xpack.ml.navMenu.jobManagementTabLinkText', {
        defaultMessage: 'Job Management',
      }),
      disabled: disableLinks,
    },
    {
      id: 'explorer',
      name: i18n.translate('xpack.ml.navMenu.anomalyExplorerTabLinkText', {
        defaultMessage: 'Anomaly Explorer',
      }),
      disabled: disableLinks,
    },
    {
      id: 'timeseriesexplorer',
      name: i18n.translate('xpack.ml.navMenu.singleMetricViewerTabLinkText', {
        defaultMessage: 'Single Metric Viewer',
      }),
      disabled: disableLinks,
    },
    {
      id: 'data_frames',
      name: i18n.translate('xpack.ml.navMenu.dataFrameTabLinkText', {
        defaultMessage: 'Data Frames',
      }),
      disabled: false,
    },
    {
      id: 'datavisualizer',
      name: i18n.translate('xpack.ml.navMenu.dataVisualizerTabLinkText', {
        defaultMessage: 'Data Visualizer',
      }),
      disabled: false,
    },
    {
      id: 'settings',
      name: i18n.translate('xpack.ml.navMenu.settingsTabLinkText', {
        defaultMessage: 'Settings',
      }),
      disabled: disableLinks,
    },
  ];
}

export const NavigationMenu: SFC<Props> = ({ disableLinks, tabId, timefilter, timeHistory }) => {
  const [tabs] = useState(getTabs(disableLinks));
  const [selectedTabId, setSelectedTabId] = useState(tabId);

  function onSelectedTabChanged(id: string) {
    // TODO: change href but keep what's saved in url
    moveToSelectedTab(id);
    setSelectedTabId(id);
  }

  function renderTabs() {
    return tabs.map((tab: Tab) => (
      <EuiTab
        className="MlNavigationMenu__tab"
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        key={`${tab.id}-key`}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs" className="MlNavigationMenu__topNav">
        <EuiFlexItem grow={false}>
          <TopNav timefilter={timefilter} timeHistory={timeHistory} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiTabs>{renderTabs()}</EuiTabs>
    </Fragment>
  );
};
