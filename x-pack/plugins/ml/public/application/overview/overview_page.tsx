/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useState } from 'react';
import {
  EuiFlexGroup,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiPageHeader,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { checkPermission } from '../capabilities/check_capabilities';
import { mlNodesAvailable } from '../ml_nodes_check/check_ml_nodes';
import { NavigationMenu } from '../components/navigation_menu';
import { GettingStartedCallout } from './components/getting_started_callout';
import { OverviewContent } from './components/content';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { JobsAwaitingNodeWarning } from '../components/jobs_awaiting_node_warning';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana, useTimefilter } from '../contexts/kibana';
import { NodesList } from '../trained_models/nodes_overview';
import { DatePickerWrapper } from '../components/navigation_menu/date_picker_wrapper';

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

  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const [adLazyJobCount, setAdLazyJobCount] = useState(0);
  const [dfaLazyJobCount, setDfaLazyJobCount] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);

  return (
    <Fragment>
      <NavigationMenu tabId="overview" />
      <EuiPage data-test-subj="mlPageOverview">
        <EuiPageBody>
          <EuiPageHeader
            pageTitle={<FormattedMessage id="xpack.ml.overview.header" defaultMessage="Overview" />}
            rightSideItems={[<DatePickerWrapper />]}
          />

          <NodeAvailableWarning />
          <JobsAwaitingNodeWarning jobCount={adLazyJobCount + dfaLazyJobCount} />
          <SavedObjectsWarning onCloseFlyout={() => setRefreshCount(refreshCount + 1)} />
          <UpgradeWarning />

          <GettingStartedCallout />

          <EuiPanel>
            <NodesList />
          </EuiPanel>

          <EuiSpacer size="m" />

          <OverviewContent
            createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob}
            createAnalyticsJobDisabled={disableCreateAnalyticsButton}
            setAdLazyJobCount={setAdLazyJobCount}
            setDfaLazyJobCount={setDfaLazyJobCount}
            refreshCount={refreshCount}
          />
        </EuiPageBody>
      </EuiPage>
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
