/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo } from 'react';

import { NavigationMenu } from '../../components/navigation_menu';

// @ts-ignore
import { JobsListView } from './components/jobs_list_view/index';
import { useUrlState } from '../../util/url_state';

interface JobsPageProps {
  blockRefresh?: boolean;
  isManagementTable?: boolean;
  isMlEnabledInSpace?: boolean;
  lastRefresh?: number;
}

const ANOMALY_DETECTION_JOBS_LIST_STATE_KEY = 'anomalyDetectionJobsList';

interface AnomalyDetectionJobsListState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  searchBar?: string;
}

export const getDefaultAnomalyDetectionJobsListState = (): AnomalyDetectionJobsListState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'id',
  sortDirection: 'asc',
});

export const JobsPage: FC<JobsPageProps> = (props) => {
  const [appState, setAppState] = useUrlState('_a');

  const jobListState: AnomalyDetectionJobsListState = useMemo(() => {
    return {
      ...getDefaultAnomalyDetectionJobsListState(),
      ...(appState?.[ANOMALY_DETECTION_JOBS_LIST_STATE_KEY] ?? {}),
    };
  }, [appState]);

  const onJobsViewStateUpdate = useCallback(
    (update: Partial<AnomalyDetectionJobsListState>) => {
      setAppState(ANOMALY_DETECTION_JOBS_LIST_STATE_KEY, {
        ...jobListState,
        ...update,
      });
    },
    [appState, setAppState]
  );

  return (
    <div data-test-subj="mlPageJobManagement">
      <NavigationMenu tabId="anomaly_detection" />
      <JobsListView
        {...props}
        jobsViewState={jobListState}
        onJobsViewStateUpdate={onJobsViewStateUpdate}
      />
    </div>
  );
};
