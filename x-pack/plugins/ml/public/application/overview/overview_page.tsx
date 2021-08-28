/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPage, EuiPageBody } from '@elastic/eui';
import type { FC } from 'react';
import React, { Fragment, useState } from 'react';
import { checkPermission } from '../capabilities/check_capabilities';
import { HelpMenu } from '../components/help_menu/help_menu';
import { JobsAwaitingNodeWarning } from '../components/jobs_awaiting_node_warning/jobs_awaiting_node_warning';
import { NavigationMenu } from '../components/navigation_menu/navigation_menu';
import { NodeAvailableWarning } from '../components/node_available_warning/node_available_warning';
import { SavedObjectsWarning } from '../components/saved_objects_warning/saved_objects_warning';
import { UpgradeWarning } from '../components/upgrade/upgrade_warning';
import { useMlKibana } from '../contexts/kibana/kibana_context';
import { mlNodesAvailable } from '../ml_nodes_check/check_ml_nodes';
import { OverviewContent } from './components/content';
import { OverviewSideBar } from './components/sidebar';

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
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
