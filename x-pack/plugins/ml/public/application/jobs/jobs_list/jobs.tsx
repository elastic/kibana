/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { ML_PAGES } from '../../../../common/constants/locator';
import type { ListingPageUrlState } from '../../../../common/types/common';
import { HelpMenu } from '../../components/help_menu/help_menu';
import { NavigationMenu } from '../../components/navigation_menu/navigation_menu';
import { useMlKibana } from '../../contexts/kibana/kibana_context';
import { usePageUrlState } from '../../util/url_state';
// @ts-ignore
import { JobsListView } from './components/jobs_list_view/index';

interface JobsPageProps {
  blockRefresh?: boolean;
  isManagementTable?: boolean;
  isMlEnabledInSpace?: boolean;
  lastRefresh?: number;
}

export const getDefaultAnomalyDetectionJobsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'id',
  sortDirection: 'asc',
});

export const JobsPage: FC<JobsPageProps> = (props) => {
  const [pageState, setPageState] = usePageUrlState(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    getDefaultAnomalyDetectionJobsListState()
  );
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.anomalyDetection;
  return (
    <div data-test-subj="mlPageJobManagement">
      <NavigationMenu tabId="anomaly_detection" />
      <JobsListView {...props} jobsViewState={pageState} onJobsViewStateUpdate={setPageState} />
      <HelpMenu docLink={helpLink} />
    </div>
  );
};
