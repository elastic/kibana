/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { NavigationMenu } from '../../components/navigation_menu';
// @ts-ignore
import { JobsListView } from './components/jobs_list_view/index';
import { usePageUrlState } from '../../util/url_state';
import { ML_PAGES } from '../../../../common/constants/ml_url_generator';

interface JobsPageProps {
  blockRefresh?: boolean;
  isManagementTable?: boolean;
  isMlEnabledInSpace?: boolean;
  lastRefresh?: number;
}

export interface AnomalyDetectionJobsListState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  queryText?: string;
}

export const getDefaultAnomalyDetectionJobsListState = (): AnomalyDetectionJobsListState => ({
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

  return (
    <div data-test-subj="mlPageJobManagement">
      <NavigationMenu tabId="anomaly_detection" />
      <JobsListView {...props} jobsViewState={pageState} onJobsViewStateUpdate={setPageState} />
    </div>
  );
};
