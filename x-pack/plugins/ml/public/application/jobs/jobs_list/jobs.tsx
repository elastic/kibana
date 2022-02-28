/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
// @ts-ignore
import { JobsListView } from './components/jobs_list_view/index';
import { usePageUrlState } from '../../util/url_state';
import { ML_PAGES } from '../../../../common/constants/locator';
import { ListingPageUrlState } from '../../../../common/types/common';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana } from '../../contexts/kibana';
import { MlPageHeader } from '../../components/page_header';
import { HeaderMenuPortal } from '../../components/header_menu_portal';
import { JobsActionMenu } from '../components/jobs_action_menu';

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
    <>
      <MlPageHeader>
        <FormattedMessage id="xpack.ml.jobsList.title" defaultMessage="Anomaly Detection Jobs" />
      </MlPageHeader>
      <HeaderMenuPortal>
        <JobsActionMenu />
      </HeaderMenuPortal>
      <JobsListView {...props} jobsViewState={pageState} onJobsViewStateUpdate={setPageState} />
      <HelpMenu docLink={helpLink} />
    </>
  );
};
