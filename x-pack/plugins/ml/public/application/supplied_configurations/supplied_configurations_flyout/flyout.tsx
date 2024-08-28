/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { Module } from '../../../../common/types/modules';
import { isLogoObject } from '../supplied_configurations';
import { OverviewTabContent } from './overview_tab_content';
import { JobsTabContent } from './jobs_tab_content';
import { KibanaTabContent } from './kibana_tab_content';

interface Props {
  module: Module;
  onClose: () => void;
}

export const TAB_IDS = {
  OVERVIEW: 'overview',
  JOBS: 'jobs',
  KIBANA: 'kibana',
} as const;
export type TabIdType = (typeof TAB_IDS)[keyof typeof TAB_IDS];

export const KIBANA_ASSETS = {
  VISUALIZATION: 'visualization',
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
} as const;
export type KibanaAssetType = (typeof KIBANA_ASSETS)[keyof typeof KIBANA_ASSETS];

export const SuppliedConfigurationsFlyout: FC<Props> = ({ module, onClose }) => {
  const [selectedTabId, setSelectedTabId] = useState<TabIdType>(TAB_IDS.OVERVIEW);
  const [selectedKibanaSubTab, setSelectedKibanaSubTab] = useState<KibanaAssetType | undefined>();

  const tabs = useMemo(() => {
    const commonTabs: Array<{ id: TabIdType; name: JSX.Element; content: JSX.Element }> = [
      {
        id: TAB_IDS.OVERVIEW,
        name: (
          <FormattedMessage
            id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.overviewTabLabel"
            defaultMessage="Overview"
          />
        ),
        content: (
          <OverviewTabContent
            module={module}
            setSelectedTabId={setSelectedTabId}
            setSelectedKibanaSubTab={setSelectedKibanaSubTab}
          />
        ),
      },
      {
        id: TAB_IDS.JOBS,
        name: (
          <FormattedMessage
            id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.jobsTabLabel"
            defaultMessage="Jobs"
          />
        ),
        content: <JobsTabContent module={module} />,
      },
    ];

    if (isPopulatedObject(module.kibana ?? {})) {
      commonTabs.push({
        id: TAB_IDS.KIBANA,
        name: (
          <FormattedMessage
            id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.kibanaTabLabel"
            defaultMessage="Kibana"
          />
        ),
        content: <KibanaTabContent module={module} selectedKibanaSubTab={selectedKibanaSubTab} />,
      });
    }

    return commonTabs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module.id, selectedKibanaSubTab]);

  const renderTabs = tabs.map((tab) => (
    <EuiTab
      onClick={() => setSelectedTabId(tab.id)}
      isSelected={tab.id === selectedTabId}
      key={tab.id}
      data-test-subj={`mlSuppliedConfigurationsFlyoutTab ${tab.id}`}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <EuiFlyout
      size="l"
      ownFocus
      onClose={onClose}
      hideCloseButton
      aria-labelledby={'supplied-configurations-flyout'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon
              size="xxl"
              type={(isLogoObject(module.logo) ? module.logo.icon : module.logo) as string}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={module.id}>{module.title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTabs style={{ marginBottom: '-25px', paddingLeft: '3%' }}>{renderTabs}</EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{tabs.find((tab) => tab.id === selectedTabId)?.content}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
