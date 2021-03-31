/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex } from 'lodash';
import React, { useEffect, useState, useMemo } from 'react';

import {
  EuiEmptyPrompt,
  EuiPageContent,
  EuiPageContentBody,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { LatestMinorBanner } from './latest_minor_banner';
import { DeprecationTab } from './es_deprecations';
import { OverviewTab } from './overview';
import { TelemetryState, UpgradeAssistantTabProps } from './types';
import { useAppContext } from '../app_context';

export const UpgradeAssistantTabs: React.FunctionComponent = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [telemetryState, setTelemetryState] = useState<TelemetryState>(TelemetryState.Complete);

  const { api } = useAppContext();

  const { data: checkupData, isLoading, error, resendRequest } = api.useLoadUpgradeStatus();

  const tabs = useMemo(() => {
    const commonTabProps: UpgradeAssistantTabProps = {
      loadingError: error,
      isLoading,
      refreshCheckupData: resendRequest,
      setSelectedTabIndex,
      // Remove this in last minor of the current major (e.g., 7.15)
      alertBanner: <LatestMinorBanner />,
    };

    return [
      {
        id: 'overview',
        'data-test-subj': 'upgradeAssistantOverviewTab',
        name: i18n.translate('xpack.upgradeAssistant.overviewTab.overviewTabTitle', {
          defaultMessage: 'Overview',
        }),
        content: <OverviewTab checkupData={checkupData} {...commonTabProps} />,
      },
      {
        id: 'cluster',
        'data-test-subj': 'upgradeAssistantClusterTab',
        name: i18n.translate('xpack.upgradeAssistant.checkupTab.clusterTabLabel', {
          defaultMessage: 'Cluster',
        }),
        content: (
          <DeprecationTab
            key="cluster"
            deprecations={checkupData ? checkupData.cluster : undefined}
            checkupLabel={i18n.translate('xpack.upgradeAssistant.tabs.checkupTab.clusterLabel', {
              defaultMessage: 'cluster',
            })}
            {...commonTabProps}
          />
        ),
      },
      {
        id: 'indices',
        'data-test-subj': 'upgradeAssistantIndicesTab',
        name: i18n.translate('xpack.upgradeAssistant.checkupTab.indicesTabLabel', {
          defaultMessage: 'Indices',
        }),
        content: (
          <DeprecationTab
            key="indices"
            deprecations={checkupData ? checkupData.indices : undefined}
            checkupLabel={i18n.translate('xpack.upgradeAssistant.checkupTab.indexLabel', {
              defaultMessage: 'index',
            })}
            showBackupWarning
            {...commonTabProps}
          />
        ),
      },
    ];
  }, [checkupData, error, isLoading, resendRequest]);

  const tabName = tabs[selectedTabIndex].id;

  useEffect(() => {
    if (isLoading === false) {
      setTelemetryState(TelemetryState.Running);

      async function sendTelemetryData() {
        await api.sendTelemetryData({
          [tabName]: true,
        });
        setTelemetryState(TelemetryState.Complete);
      }

      sendTelemetryData();
    }
  }, [api, selectedTabIndex, tabName, isLoading]);

  const onTabClick = (selectedTab: EuiTabbedContentTab) => {
    const newSelectedTabIndex = findIndex(tabs, { id: selectedTab.id });
    if (selectedTabIndex === -1) {
      throw new Error('Clicked tab did not exist in tabs array');
    }
    setSelectedTabIndex(newSelectedTabIndex);
  };

  if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === false) {
    return (
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiEmptyPrompt
            iconType="logoElasticsearch"
            data-test-subj="partiallyUpgradedPrompt"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradingTitle"
                  defaultMessage="Your cluster is upgrading"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradingDescription"
                  defaultMessage="One or more Elasticsearch nodes have a newer version of
                      Elasticsearch than Kibana. Once all your nodes are upgraded, upgrade Kibana."
                />
              </p>
            }
          />
        </EuiPageContentBody>
      </EuiPageContent>
    );
  } else if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === true) {
    return (
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiEmptyPrompt
            iconType="logoElasticsearch"
            data-test-subj="upgradedPrompt"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradeCompleteTitle"
                  defaultMessage="Your cluster has been upgraded"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradeCompleteDescription"
                  defaultMessage="All Elasticsearch nodes have been upgraded. You may now upgrade Kibana."
                />
              </p>
            }
          />
        </EuiPageContentBody>
      </EuiPageContent>
    );
  }

  return (
    <EuiTabbedContent
      data-test-subj={
        telemetryState === TelemetryState.Running ? 'upgradeAssistantTelemetryRunning' : undefined
      }
      tabs={tabs}
      onTabClick={onTabClick}
      selectedTab={tabs[selectedTabIndex]}
    />
  );
};
