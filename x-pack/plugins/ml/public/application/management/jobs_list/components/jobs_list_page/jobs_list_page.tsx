/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, Fragment, FC, useMemo, useCallback } from 'react';
import { Router } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { ManagementAppMountParams } from '../../../../../../../../../src/plugins/management/public/';

import { checkGetManagementMlJobsResolver } from '../../../../capabilities/check_capabilities';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../../../../../src/plugins/kibana_react/public';

import { getDocLinks } from '../../../../util/dependency_cache';
// @ts-ignore undeclared module
import { JobsListView } from '../../../../jobs/jobs_list/components/jobs_list_view/index';
import { DataFrameAnalyticsList } from '../../../../data_frame_analytics/pages/analytics_management/components/analytics_list';
import { AccessDeniedPage } from '../access_denied_page';
import { SharePluginStart } from '../../../../../../../../../src/plugins/share/public';
import { getDefaultAnomalyDetectionJobsListState } from '../../../../jobs/jobs_list/jobs';
import { getMlGlobalServices } from '../../../../app';
import { ListingPageUrlState } from '../../../../../../common/types/common';
import { getDefaultDFAListState } from '../../../../data_frame_analytics/pages/analytics_management/page';

interface Tab {
  'data-test-subj': string;
  id: string;
  name: string;
  content: any;
}

function usePageState<T extends ListingPageUrlState>(
  defaultState: T
): [T, (update: Partial<T>) => void] {
  const [pageState, setPageState] = useState<T>(defaultState);

  const updateState = useCallback(
    (update: Partial<T>) => {
      setPageState({
        ...pageState,
        ...update,
      });
    },
    [pageState]
  );

  return [pageState, updateState];
}

function useTabs(isMlEnabledInSpace: boolean): Tab[] {
  const [adPageState, updateAdPageState] = usePageState(getDefaultAnomalyDetectionJobsListState());
  const [dfaPageState, updateDfaPageState] = usePageState(getDefaultDFAListState());

  return useMemo(
    () => [
      {
        'data-test-subj': 'mlStackManagementJobsListAnomalyDetectionTab',
        id: 'anomaly_detection_jobs',
        name: i18n.translate('xpack.ml.management.jobsList.anomalyDetectionTab', {
          defaultMessage: 'Anomaly detection',
        }),
        content: (
          <Fragment>
            <EuiSpacer size="m" />
            <JobsListView
              jobsViewState={adPageState}
              onJobsViewStateUpdate={updateAdPageState}
              isManagementTable={true}
              isMlEnabledInSpace={isMlEnabledInSpace}
            />
          </Fragment>
        ),
      },
      {
        'data-test-subj': 'mlStackManagementJobsListAnalyticsTab',
        id: 'analytics_jobs',
        name: i18n.translate('xpack.ml.management.jobsList.analyticsTab', {
          defaultMessage: 'Analytics',
        }),
        content: (
          <Fragment>
            <EuiSpacer size="m" />
            <DataFrameAnalyticsList
              isManagementTable={true}
              isMlEnabledInSpace={isMlEnabledInSpace}
              pageState={dfaPageState}
              updatePageState={updateDfaPageState}
            />
          </Fragment>
        ),
      },
    ],
    [isMlEnabledInSpace, adPageState, updateAdPageState, dfaPageState, updateDfaPageState]
  );
}

export const JobsListPage: FC<{
  coreStart: CoreStart;
  share: SharePluginStart;
  history: ManagementAppMountParams['history'];
}> = ({ coreStart, share, history }) => {
  const [initialized, setInitialized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMlEnabledInSpace, setIsMlEnabledInSpace] = useState(false);
  const tabs = useTabs(isMlEnabledInSpace);
  const [currentTabId, setCurrentTabId] = useState(tabs[0].id);
  const I18nContext = coreStart.i18n.Context;

  const check = async () => {
    try {
      const checkPrivilege = await checkGetManagementMlJobsResolver();
      setIsMlEnabledInSpace(checkPrivilege.mlFeatureEnabledInSpace);
    } catch (e) {
      setAccessDenied(true);
    }
    setInitialized(true);
  };

  useEffect(() => {
    check();
  }, []);

  if (initialized === false) {
    return null;
  }

  const docLinks = getDocLinks();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const anomalyDetectionJobsUrl = `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-jobs.html`;
  const anomalyJobsUrl = `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics.html`;

  const anomalyDetectionDocsLabel = i18n.translate(
    'xpack.ml.management.jobsList.anomalyDetectionDocsLabel',
    {
      defaultMessage: 'Anomaly detection jobs docs',
    }
  );
  const analyticsDocsLabel = i18n.translate('xpack.ml.management.jobsList.analyticsDocsLabel', {
    defaultMessage: 'Analytics jobs docs',
  });

  function renderTabs() {
    return (
      <EuiTabbedContent
        onTabClick={({ id }: { id: string }) => {
          setCurrentTabId(id);
        }}
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
      />
    );
  }

  if (accessDenied) {
    return <AccessDeniedPage />;
  }

  return (
    <RedirectAppLinks application={coreStart.application}>
      <I18nContext>
        <KibanaContextProvider
          services={{ ...coreStart, share, mlServices: getMlGlobalServices(coreStart.http) }}
        >
          <Router history={history}>
            <EuiPageContent
              id="kibanaManagementMLSection"
              data-test-subj="mlPageStackManagementJobsList"
            >
              <EuiTitle size="l">
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <h1>
                      {i18n.translate('xpack.ml.management.jobsList.jobsListTitle', {
                        defaultMessage: 'Machine Learning Jobs',
                      })}
                    </h1>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      target="_blank"
                      iconType="help"
                      iconSide="left"
                      color="primary"
                      href={
                        currentTabId === 'anomaly_detection_jobs'
                          ? anomalyDetectionJobsUrl
                          : anomalyJobsUrl
                      }
                    >
                      {currentTabId === 'anomaly_detection_jobs'
                        ? anomalyDetectionDocsLabel
                        : analyticsDocsLabel}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiTitle size="s">
                <EuiText color="subdued">
                  {i18n.translate('xpack.ml.management.jobsList.jobsListTagline', {
                    defaultMessage: 'View machine learning analytics and anomaly detection jobs.',
                  })}
                </EuiText>
              </EuiTitle>
              <EuiSpacer size="l" />
              <EuiPageContentBody>{renderTabs()}</EuiPageContentBody>
            </EuiPageContent>
          </Router>
        </KibanaContextProvider>
      </I18nContext>
    </RedirectAppLinks>
  );
};
