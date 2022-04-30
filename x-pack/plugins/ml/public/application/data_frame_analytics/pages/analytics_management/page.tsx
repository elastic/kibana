/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';

import { useLocation } from 'react-router-dom';
import { useUrlState } from '../../../util/url_state';
import { NavigationMenu } from '../../../components/navigation_menu';
import { DatePickerWrapper } from '../../../components/navigation_menu/date_picker_wrapper';
import { DataFrameAnalyticsList } from './components/analytics_list';
import { useRefreshInterval } from './components/analytics_list/use_refresh_interval';
import { RefreshAnalyticsListButton } from './components/refresh_analytics_list_button';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { SavedObjectsWarning } from '../../../components/saved_objects_warning';
import { UpgradeWarning } from '../../../components/upgrade';
import { AnalyticsNavigationBar } from './components/analytics_navigation_bar';
import { JobMap } from '../job_map';
import { usePageUrlState } from '../../../util/url_state';
import { ListingPageUrlState } from '../../../../../common/types/common';
import { DataFrameAnalyticsListColumn } from './components/analytics_list/common';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana } from '../../../contexts/kibana';
import { useRefreshAnalyticsList } from '../../common';

export const getDefaultDFAListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: DataFrameAnalyticsListColumn.id,
  sortDirection: 'asc',
});

export const Page: FC = () => {
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [globalState] = useUrlState('_g');

  const [dfaPageState, setDfaPageState] = usePageUrlState(
    ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
    getDefaultDFAListState()
  );

  useRefreshInterval(setBlockRefresh);
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });

  const location = useLocation();
  const selectedTabId = useMemo(() => location.pathname.split('/').pop(), [location]);
  const mapJobId = globalState?.ml?.jobId;
  const mapModelId = globalState?.ml?.modelId;
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;
  return (
    <Fragment>
      <NavigationMenu tabId="data_frame_analytics" />
      <EuiPage data-test-subj="mlPageDataFrameAnalytics">
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsList.title"
                    defaultMessage="Data frame analytics"
                  />
                </h1>
              </EuiTitle>
            </EuiPageHeaderSection>
            <EuiPageHeaderSection>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                {selectedTabId !== 'map' && (
                  <>
                    <EuiFlexItem grow={false}>
                      <RefreshAnalyticsListButton />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <DatePickerWrapper />
                    </EuiFlexItem>
                  </>
                )}
              </EuiFlexGroup>
            </EuiPageHeaderSection>
          </EuiPageHeader>

          <NodeAvailableWarning />
          <SavedObjectsWarning
            jobType="data-frame-analytics"
            onCloseFlyout={refresh}
            forceRefresh={isLoading}
          />
          <UpgradeWarning />

          <EuiPageContent>
            <AnalyticsNavigationBar
              selectedTabId={selectedTabId}
              jobId={mapJobId}
              modelId={mapModelId}
            />
            {selectedTabId === 'map' && (mapJobId || mapModelId) && (
              <JobMap analyticsId={mapJobId} modelId={mapModelId} />
            )}
            {selectedTabId === 'data_frame_analytics' && (
              <DataFrameAnalyticsList
                blockRefresh={blockRefresh}
                pageState={dfaPageState}
                updatePageState={setDfaPageState}
              />
            )}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
