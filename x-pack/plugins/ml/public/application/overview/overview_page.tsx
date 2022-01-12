/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
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
import { useUrlState } from '../util/url_state';
import { useRefresh } from '../routing/use_refresh';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';
import { MlPageHeader } from '../components/page_header';

export const OverviewPage: FC = () => {
  const canViewMlNodes = checkPermission('canViewMlNodes');

  const disableCreateAnomalyDetectionJob = !checkPermission('canCreateJob') || !mlNodesAvailable();
  const disableCreateAnalyticsButton =
    !mlNodesAvailable() ||
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  const [globalState, setGlobalState] = useUrlState('_g');
  const [lastRefresh, setLastRefresh] = useState(0);

  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });
  const refresh = useRefresh();

  useEffect(() => {
    if (refresh !== undefined && lastRefresh !== refresh.lastRefresh) {
      setLastRefresh(refresh?.lastRefresh);

      if (refresh.timeRange !== undefined) {
        const { start, end } = refresh.timeRange;
        setGlobalState('time', {
          from: start,
          to: end,
          ...(start === 'now' || end === 'now' ? { ts: Date.now() } : {}),
        });
      }
    }
  }, [refresh?.lastRefresh, lastRefresh, setLastRefresh, setGlobalState]);

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [globalState?.time?.from, globalState?.time?.to, globalState?.time?.ts]);

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
        createAnalyticsJobDisabled={disableCreateAnalyticsButton}
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
