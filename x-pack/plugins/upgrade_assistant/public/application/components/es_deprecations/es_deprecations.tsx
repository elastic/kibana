/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiPageBody,
  EuiPageHeader,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationTabContent } from './deprecation_tab_content';
import { UpgradeAssistantTabProps, EsTabs } from '../types';
import { useAppContext } from '../../app_context';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageTitle', {
    defaultMessage: 'Elasticsearch',
  }),
  pageDescription: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageDescription', {
    defaultMessage:
      'Some Elasticsearch issues may require your attention. Resolve them before upgrading.',
  }),
  docLinkText: i18n.translate('xpack.upgradeAssistant.esDeprecations.docLinkText', {
    defaultMessage: 'Documentation',
  }),
  backupDataButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.backupDataButtonLabel',
    {
      defaultMessage: 'Back up your data',
    }
  ),
  clusterTab: {
    tabName: i18n.translate('xpack.upgradeAssistant.esDeprecations.clusterTabLabel', {
      defaultMessage: 'Cluster',
    }),
    deprecationType: i18n.translate('xpack.upgradeAssistant.esDeprecations.clusterLabel', {
      defaultMessage: 'cluster',
    }),
  },
  indicesTab: {
    tabName: i18n.translate('xpack.upgradeAssistant.esDeprecations.indicesTabLabel', {
      defaultMessage: 'Indices',
    }),
    deprecationType: i18n.translate('xpack.upgradeAssistant.esDeprecations.indexLabel', {
      defaultMessage: 'index',
    }),
  },
};

interface MatchParams {
  tabName: EsTabs;
}

export const EsDeprecationsContent = withRouter(
  ({
    match: {
      params: { tabName },
    },
    history,
  }: RouteComponentProps<MatchParams>) => {
    // const [telemetryState, setTelemetryState] = useState<TelemetryState>(TelemetryState.Complete);

    const { api, breadcrumbs } = useAppContext();

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
          name: i18nTexts.clusterTab.tabName,
          content: (
            <DeprecationTabContent
              key="cluster"
              deprecations={checkupData ? checkupData.cluster : undefined}
              checkupLabel={i18nTexts.clusterTab.deprecationType}
              {...commonTabProps}
            />
          ),
        },
        {
          id: 'indices',
          'data-test-subj': 'upgradeAssistantIndicesTab',
          name: i18nTexts.indicesTab.tabName,
          content: (
            <DeprecationTabContent
              key="indices"
              deprecations={checkupData ? checkupData.indices : undefined}
              checkupLabel={i18nTexts.indicesTab.deprecationType}
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

    useEffect(() => {
      breadcrumbs.setBreadcrumbs('esDeprecations');
    }, [breadcrumbs]);

    return (
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageHeader
            pageTitle={i18nTexts.pageTitle}
            description={i18nTexts.pageDescription}
            rightSideItems={[
              <EuiButtonEmpty
                // TODO add doc link
                href={'#'}
                target="_blank"
                iconType="help"
                data-test-subj="documentationLink"
              >
                {i18nTexts.docLinkText}
              </EuiButtonEmpty>,
            ]}
          >
            {/* TODO Add link to Snapshot + Restore */}
            <EuiButton fill href="#" iconType="popout" iconSide="right">
              {i18nTexts.backupDataButtonLabel}
            </EuiButton>
          </EuiPageHeader>

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
