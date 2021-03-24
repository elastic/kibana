/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiButtonEmpty,
  EuiPageBody,
  EuiPageHeader,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationTab } from './es_deprecations';
import { UpgradeAssistantTabProps, Tabs } from './types';
import { useAppContext } from '../app_context';

interface MatchParams {
  tabName: Tabs;
}

export const UpgradeAssistantTabs = withRouter(
  ({
    match: {
      params: { tabName },
    },
    history,
  }: RouteComponentProps<MatchParams>) => {
    // const [telemetryState, setTelemetryState] = useState<TelemetryState>(TelemetryState.Complete);

    const { api } = useAppContext();

    const { data: checkupData, isLoading, error, resendRequest } = api.useLoadUpgradeStatus();

    const onTabClick = (selectedTab: EuiTabbedContentTab) => {
      history.push(`/es_deprecations/${selectedTab.id}`);
    };

    const tabs = useMemo(() => {
      const commonTabProps: UpgradeAssistantTabProps = {
        loadingError: error,
        isLoading,
        refreshCheckupData: resendRequest,
        navigateToOverviewPage: () => history.push('/overview'),
      };

      return [
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
    }, [checkupData, error, history, isLoading, resendRequest]);

    // useEffect(() => {
    //   if (isLoading === false) {
    //     setTelemetryState(TelemetryState.Running);

    //     async function sendTelemetryData() {
    //       await api.sendTelemetryData({
    //         [tabName]: true,
    //       });
    //       setTelemetryState(TelemetryState.Complete);
    //     }

    //     sendTelemetryData();
    //   }
    // }, [api, selectedTabIndex, tabName, isLoading]);

    return (
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageHeader
            pageTitle="Elasticsearch"
            rightSideItems={[
              <EuiButtonEmpty
                // TODO add doc link
                href={'#'}
                target="_blank"
                iconType="help"
                data-test-subj="documentationLink"
              >
                Documentation
              </EuiButtonEmpty>,
            ]}
          />

          <EuiPageContentBody>
            <EuiTabbedContent
              // data-test-subj={
              //   telemetryState === TelemetryState.Running ? 'upgradeAssistantTelemetryRunning' : undefined
              // }
              tabs={tabs}
              onTabClick={onTabClick}
              selectedTab={tabs.find((tab) => tab.id === tabName)}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
);
