/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState } from 'react';
import { EuiFlexGroup, EuiPage, EuiPageBody } from '@elastic/eui';
import { checkPermission } from '../capabilities/check_capabilities';
import { mlNodesAvailable } from '../ml_nodes_check/check_ml_nodes';
import { NavigationMenu } from '../components/navigation_menu';
import { OverviewSideBar } from './components/sidebar';
import { OverviewContent } from './components/content';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { JobsAwaitingNodeWarning } from '../components/jobs_awaiting_node_warning';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import { UpgradeWarning } from '../components/upgrade';

export const OverviewPage: FC = () => {
  const disableCreateAnomalyDetectionJob = !checkPermission('canCreateJob') || !mlNodesAvailable();
  const disableCreateAnalyticsButton =
    !mlNodesAvailable() ||
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  const [adLazyJobCount, setAdLazyJobCount] = useState(0);
  const [dfaLazyJobCount, setDfaLazyJobCount] = useState(0);

  return (
    <Fragment>
      <NavigationMenu tabId="overview" />
      <EuiPage data-test-subj="mlPageOverview">
        <EuiPageBody>
          <NodeAvailableWarning />
          <JobsAwaitingNodeWarning jobCount={adLazyJobCount + dfaLazyJobCount} />
          <SavedObjectsWarning />
          <UpgradeWarning />

          <EuiFlexGroup>
            <OverviewSideBar createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob} />
            <OverviewContent
              createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob}
              createAnalyticsJobDisabled={disableCreateAnalyticsButton}
              setAdLazyJobCount={setAdLazyJobCount}
              setDfaLazyJobCount={setDfaLazyJobCount}
            />
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
