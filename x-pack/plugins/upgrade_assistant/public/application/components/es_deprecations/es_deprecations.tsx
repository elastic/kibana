/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiPageHeader,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiToolTip,
  EuiNotificationBadge,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAppContext } from '../../app_context';
import { UpgradeAssistantTabProps, EsTabs, TelemetryState } from '../types';
import { DeprecationTabContent } from './deprecation_tab_content';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageTitle', {
    defaultMessage: 'Elasticsearch',
  }),
  pageDescription: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageDescription', {
    defaultMessage:
      'Review the deprecated cluster and index settings. You must resolve any critical issues before upgrading.',
  }),
  docLinkText: i18n.translate('xpack.upgradeAssistant.esDeprecations.docLinkText', {
    defaultMessage: 'Documentation',
  }),
  backupDataButton: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.backupDataButtonLabel', {
      defaultMessage: 'Back up your data',
    }),
    tooltipText: i18n.translate('xpack.upgradeAssistant.esDeprecations.backupDataTooltipText', {
      defaultMessage: 'Take a snapshot before you make any changes.',
    }),
  },
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
    const [telemetryState, setTelemetryState] = useState<TelemetryState>(TelemetryState.Complete);

    const { api, breadcrumbs, getUrlForApp, docLinks } = useAppContext();

    const { data: checkupData, isLoading, error, resendRequest } = api.useLoadUpgradeStatus();

    const onTabClick = (selectedTab: EuiTabbedContentTab) => {
      history.push(`/es_deprecations/${selectedTab.id}`);
    };

    const tabs = useMemo(() => {
      const commonTabProps: UpgradeAssistantTabProps = {
        error,
        isLoading,
        refreshCheckupData: resendRequest,
        navigateToOverviewPage: () => history.push('/overview'),
      };

      return [
        {
          id: 'cluster',
          'data-test-subj': 'upgradeAssistantClusterTab',
          name: (
            <span>
              {i18nTexts.clusterTab.tabName}
              {checkupData && checkupData.cluster.length > 0 && (
                <>
                  {' '}
                  <EuiNotificationBadge>{checkupData.cluster.length}</EuiNotificationBadge>
                </>
              )}
            </span>
          ),
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
          name: (
            <span>
              {i18nTexts.indicesTab.tabName}
              {checkupData && checkupData.indices.length > 0 && (
                <>
                  {' '}
                  <EuiNotificationBadge>{checkupData.indices.length}</EuiNotificationBadge>
                </>
              )}
            </span>
          ),
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

    useEffect(() => {
      breadcrumbs.setBreadcrumbs('esDeprecations');
    }, [breadcrumbs]);

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
    }, [api, tabName, isLoading]);

    return (
      <>
        <EuiPageHeader
          pageTitle={i18nTexts.pageTitle}
          description={i18nTexts.pageDescription}
          rightSideItems={[
            <EuiButtonEmpty
              href={docLinks.links.upgradeAssistant}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              {i18nTexts.docLinkText}
            </EuiButtonEmpty>,
          ]}
        >
          <EuiToolTip position="bottom" content={i18nTexts.backupDataButton.tooltipText}>
            <EuiButton
              fill
              href={getUrlForApp('management', {
                path: 'data/snapshot_restore',
              })}
              iconType="popout"
              iconSide="right"
              target="_blank"
            >
              {i18nTexts.backupDataButton.label}
            </EuiButton>
          </EuiToolTip>
        </EuiPageHeader>

        <EuiSpacer size="l" />

        <EuiTabbedContent
          data-test-subj={
            telemetryState === TelemetryState.Running
              ? 'upgradeAssistantTelemetryRunning'
              : undefined
          }
          tabs={tabs}
          onTabClick={onTabClick}
          selectedTab={tabs.find((tab) => tab.id === tabName)}
        />
      </>
    );
  }
);
