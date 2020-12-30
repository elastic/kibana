/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiPage, EuiPageBody } from '@elastic/eui';
import { checkPermission } from '../capabilities/check_capabilities';
import { mlNodesAvailable } from '../ml_nodes_check/check_ml_nodes';
import { NavigationMenu } from '../components/navigation_menu';
import { OverviewSideBar } from './components/sidebar';
import { OverviewContent } from './components/content';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana } from '../contexts/kibana';

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
  return (
    <Fragment>
      <NavigationMenu tabId="overview" />
      <EuiPage data-test-subj="mlPageOverview">
        <EuiPageBody>
          <NodeAvailableWarning />
          <SavedObjectsWarning />
          <UpgradeWarning />

          <EuiFlexGroup>
            <OverviewSideBar createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob} />
            <OverviewContent
              createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob}
              createAnalyticsJobDisabled={disableCreateAnalyticsButton}
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
