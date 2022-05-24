/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { Redirect } from 'react-router-dom';
import { useEnablement } from '../../../hooks';

import { MONITORS_ROUTE, GETTING_STARTED_ROUTE } from '../../../../../../common/constants';

import { useMonitorList } from '../hooks/use_monitor_list';
import { useOverviewBreadcrumbs } from './use_breadcrumbs';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();

  const {
    enablement: { isEnabled },
    loading: enablementLoading,
  } = useEnablement();

  const { syntheticsMonitors, loading: monitorsLoading } = useMonitorList();

  if (!enablementLoading && isEnabled && !monitorsLoading && syntheticsMonitors.length === 0) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  } else {
    return <Redirect to={MONITORS_ROUTE} />;
  }
};
