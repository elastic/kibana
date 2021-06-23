/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, Fragment, FC, useMemo, useCallback } from 'react';
import { Router } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';

import {
  EuiButtonEmpty,
  EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';

import type { SpacesContextProps } from 'src/plugins/spaces_oss/public';
import { PLUGIN_ID } from '../../../../../../common/constants/app';
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
import { InsufficientLicensePage } from '../insufficient_license_page';
import { SharePluginStart } from '../../../../../../../../../src/plugins/share/public';
import type { SpacesPluginStart } from '../../../../../../../spaces/public';
import { JobSpacesSyncFlyout } from '../../../../components/job_spaces_sync';
import { getDefaultAnomalyDetectionJobsListState } from '../../../../jobs/jobs_list/jobs';
import { getMlGlobalServices } from '../../../../app';
import { ListingPageUrlState } from '../../../../../../common/types/common';
import { getDefaultDFAListState } from '../../../../data_frame_analytics/pages/analytics_management/page';

interface Tab extends EuiTabbedContentTab {
  'data-test-subj': string;
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

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

function useTabs(isMlEnabledInSpace: boolean, spacesApi: SpacesPluginStart | undefined): Tab[] {
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
              spacesApi={spacesApi}
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
              spacesApi={spacesApi}
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
  spacesApi?: SpacesPluginStart;
}> = ({ coreStart, share, history, spacesApi }) => {
  const spacesEnabled = spacesApi !== undefined;
  const [initialized, setInitialized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPlatinumOrTrialLicense, setIsPlatinumOrTrialLicense] = useState(true);
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  const [isMlEnabledInSpace, setIsMlEnabledInSpace] = useState(false);
  const tabs = useTabs(isMlEnabledInSpace, spacesApi);
  const [currentTabId, setCurrentTabId] = useState(tabs[0].id);
  const I18nContext = coreStart.i18n.Context;

  const check = async () => {
    try {
      const { mlFeatureEnabledInSpace } = await checkGetManagementMlJobsResolver();
      setIsMlEnabledInSpace(mlFeatureEnabledInSpace);
    } catch (e) {
      if (e.mlFeatureEnabledInSpace && e.isPlatinumOrTrialLicense === false) {
        setIsPlatinumOrTrialLicense(false);
      } else {
        setAccessDenied(true);
      }
    }
    setInitialized(true);
  };

  useEffect(() => {
    check();
  }, []);

  const ContextWrapper = useCallback(
    spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  if (initialized === false) {
    return null;
  }

  const anomalyDetectionJobsUrl = getDocLinks().links.ml.anomalyDetectionJobs;
  const dataFrameAnalyticsUrl = getDocLinks().links.ml.dataFrameAnalytics;

  const anomalyDetectionDocsLabel = i18n.translate(
    'xpack.ml.management.jobsList.anomalyDetectionDocsLabel',
    {
      defaultMessage: 'Anomaly detection jobs docs',
    }
  );
  const analyticsDocsLabel = i18n.translate('xpack.ml.management.jobsList.analyticsDocsLabel', {
    defaultMessage: 'Analytics jobs docs',
  });

  const docsLink = (
    <EuiButtonEmpty
      href={
        currentTabId === 'anomaly_detection_jobs' ? anomalyDetectionJobsUrl : dataFrameAnalyticsUrl
      }
      target="_blank"
      iconType="help"
      data-test-subj="documentationLink"
    >
      {currentTabId === 'anomaly_detection_jobs' ? anomalyDetectionDocsLabel : analyticsDocsLabel}
    </EuiButtonEmpty>
  );

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

  function onCloseSyncFlyout() {
    setShowSyncFlyout(false);
  }

  if (accessDenied) {
    return <AccessDeniedPage />;
  }

  if (isPlatinumOrTrialLicense === false) {
    return <InsufficientLicensePage basePath={coreStart.http.basePath} />;
  }

  return (
    <RedirectAppLinks application={coreStart.application}>
      <I18nContext>
        <KibanaContextProvider
          services={{ ...coreStart, share, mlServices: getMlGlobalServices(coreStart.http) }}
        >
          <ContextWrapper feature={PLUGIN_ID}>
            <Router history={history}>
              <EuiPageHeader
                pageTitle={
                  <FormattedMessage
                    id="xpack.ml.management.jobsList.jobsListTitle"
                    defaultMessage="Machine Learning Jobs"
                  />
                }
                description={
                  <FormattedMessage
                    id="xpack.ml.management.jobsList.jobsListTagline"
                    defaultMessage="View machine learning analytics and anomaly detection jobs."
                  />
                }
                rightSideItems={[docsLink]}
                bottomBorder
              />

              <EuiSpacer size="l" />

              <EuiPageContentBody
                id="kibanaManagementMLSection"
                data-test-subj="mlPageStackManagementJobsList"
              >
                {spacesEnabled && (
                  <>
                    <EuiButtonEmpty onClick={() => setShowSyncFlyout(true)}>
                      {i18n.translate('xpack.ml.management.jobsList.syncFlyoutButton', {
                        defaultMessage: 'Synchronize saved objects',
                      })}
                    </EuiButtonEmpty>
                    {showSyncFlyout && <JobSpacesSyncFlyout onClose={onCloseSyncFlyout} />}
                    <EuiSpacer size="s" />
                  </>
                )}
                {renderTabs()}
              </EuiPageContentBody>
            </Router>
          </ContextWrapper>
        </KibanaContextProvider>
      </I18nContext>
    </RedirectAppLinks>
  );
};
