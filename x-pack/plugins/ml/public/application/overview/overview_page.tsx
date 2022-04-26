/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { checkPermission } from '../capabilities/check_capabilities';
import { mlNodesAvailable } from '../ml_nodes_check';
import { GettingStartedCallout } from './components/getting_started_callout';
import { OverviewContent } from './components/content';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { JobsAwaitingNodeWarning } from '../components/jobs_awaiting_node_warning';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana, useTimefilter } from '../contexts/kibana';
import { NodesList } from '../trained_models/nodes_overview';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';
import { MlPageHeader } from '../components/page_header';

export const OverviewPage: FC = () => {
  const canViewMlNodes = checkPermission('canViewMlNodes');

  const disableCreateAnomalyDetectionJob = !checkPermission('canCreateJob') || !mlNodesAvailable();
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const [adLazyJobCount, setAdLazyJobCount] = useState(0);
  const [dfaLazyJobCount, setDfaLazyJobCount] = useState(0);

  return (
    <div>
      <MlPageHeader>
        <FormattedMessage id="xpack.ml.overview.overviewLabel" defaultMessage="Overview" />
      </MlPageHeader>
      <NodeAvailableWarning />
      <JobsAwaitingNodeWarning jobCount={adLazyJobCount + dfaLazyJobCount} />
      <SavedObjectsWarning
        onCloseFlyout={() => {
          const { from, to } = timefilter.getTime();
          const timeRange = { start: from, end: to };
          mlTimefilterRefresh$.next({
            lastRefresh: Date.now(),
            timeRange,
          });
        }}
      />
      <UpgradeWarning />

      <GettingStartedCallout />

      {canViewMlNodes ? (
        <>
          <EuiPanel hasShadow={false} hasBorder>
            <NodesList compactView />
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      ) : null}

      <OverviewContent
        createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob}
        setAdLazyJobCount={setAdLazyJobCount}
        setDfaLazyJobCount={setDfaLazyJobCount}
      />
      <HelpMenu docLink={helpLink} />
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
