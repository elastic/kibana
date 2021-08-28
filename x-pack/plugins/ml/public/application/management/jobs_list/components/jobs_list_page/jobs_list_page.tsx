/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Router } from 'react-router-dom';
import type { CoreStart } from '../../../../../../../../../src/core/public/types';
import type { DataPublicPluginStart } from '../../../../../../../../../src/plugins/data/public/types';
import { RedirectAppLinks } from '../../../../../../../../../src/plugins/kibana_react/public/app_links/redirect_app_link';
import { KibanaContextProvider } from '../../../../../../../../../src/plugins/kibana_react/public/context/context';
import type { ManagementAppMountParams } from '../../../../../../../../../src/plugins/management/public/types';
import type { SharePluginStart } from '../../../../../../../../../src/plugins/share/public/plugin';
import type { SpacesContextProps } from '../../../../../../../../../src/plugins/spaces_oss/public/api';
import type { UsageCollectionSetup } from '../../../../../../../../../src/plugins/usage_collection/public/plugin';
import type { SpacesPluginStart } from '../../../../../../../spaces/public/plugin';
import { PLUGIN_ID } from '../../../../../../common/constants/app';
import type { ListingPageUrlState } from '../../../../../../common/types/common';
import type { JobType } from '../../../../../../common/types/saved_objects';
import { getMlGlobalServices } from '../../../../app';
import { checkGetManagementMlJobsResolver } from '../../../../capabilities/check_capabilities';
import { ExportJobsFlyout } from '../../../../components/import_export_jobs/export_jobs_flyout/export_jobs_flyout';
import { ImportJobsFlyout } from '../../../../components/import_export_jobs/import_jobs_flyout/import_jobs_flyout';
import { JobSpacesSyncFlyout } from '../../../../components/job_spaces_sync/job_spaces_sync_flyout';
import { DataFrameAnalyticsList } from '../../../../data_frame_analytics/pages/analytics_management/components/analytics_list/analytics_list';
import { getDefaultDFAListState } from '../../../../data_frame_analytics/pages/analytics_management/page';
// @ts-ignore undeclared module
import { JobsListView } from '../../../../jobs/jobs_list/components/jobs_list_view/index';
import { getDefaultAnomalyDetectionJobsListState } from '../../../../jobs/jobs_list/jobs';
import { getDocLinks } from '../../../../util/dependency_cache';
import { AccessDeniedPage } from '../access_denied_page';
import { InsufficientLicensePage } from '../insufficient_license_page';



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
        id: 'anomaly-detector',
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
        id: 'data-frame-analytics',
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
  data: DataPublicPluginStart;
  usageCollection?: UsageCollectionSetup;
}> = ({ coreStart, share, history, spacesApi, data, usageCollection }) => {
  const spacesEnabled = spacesApi !== undefined;
  const [initialized, setInitialized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPlatinumOrTrialLicense, setIsPlatinumOrTrialLicense] = useState(true);
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  const [isMlEnabledInSpace, setIsMlEnabledInSpace] = useState(false);
  const tabs = useTabs(isMlEnabledInSpace, spacesApi);
  const [currentTabId, setCurrentTabId] = useState<JobType>('anomaly-detector');
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
      href={currentTabId === 'anomaly-detector' ? anomalyDetectionJobsUrl : dataFrameAnalyticsUrl}
      target="_blank"
      iconType="help"
      data-test-subj="documentationLink"
    >
      {currentTabId === 'anomaly-detector' ? anomalyDetectionDocsLabel : analyticsDocsLabel}
    </EuiButtonEmpty>
  );

  function renderTabs() {
    return (
      <EuiTabbedContent
        onTabClick={({ id }: { id: string }) => {
          setCurrentTabId(id as JobType);
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
          services={{
            ...coreStart,
            share,
            data,
            usageCollection,
            mlServices: getMlGlobalServices(coreStart.http, usageCollection),
          }}
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
                    defaultMessage="View, export, and import machine learning analytics and anomaly detection jobs."
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
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    {spacesEnabled && (
                      <>
                        <EuiButtonEmpty
                          onClick={() => setShowSyncFlyout(true)}
                          data-test-subj="mlStackMgmtSyncButton"
                        >
                          {i18n.translate('xpack.ml.management.jobsList.syncFlyoutButton', {
                            defaultMessage: 'Synchronize saved objects',
                          })}
                        </EuiButtonEmpty>
                        {showSyncFlyout && <JobSpacesSyncFlyout onClose={onCloseSyncFlyout} />}
                        <EuiSpacer size="s" />
                      </>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ExportJobsFlyout isDisabled={false} currentTab={currentTabId} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ImportJobsFlyout isDisabled={false} />
                  </EuiFlexItem>
                </EuiFlexGroup>
                {renderTabs()}
              </EuiPageContentBody>
            </Router>
          </ContextWrapper>
        </KibanaContextProvider>
      </I18nContext>
    </RedirectAppLinks>
  );
};
