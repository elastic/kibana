/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { monitorListSelector } from '../../state/monitor_management/selectors';
import { GETTING_STARTED_ROUTE } from '../../../../../common/constants';
import { fetchMonitorListAction } from '../../state/monitor_management/monitor_list';
import { useSyntheticsSettingsContext } from '../../contexts';
import { useOverviewBreadcrumbs } from './use_breadcrumbs';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();
  const { basePath } = useSyntheticsSettingsContext();

  const dispatch = useDispatch();

  const { total } = useSelector(monitorListSelector);

  useEffect(() => {
    dispatch(fetchMonitorListAction.get());
  }, [dispatch]);

  if (total === 0) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  return (
    <EuiFlexGroup direction={'column'}>
      <EuiFlexItem>
        <p>This page should show empty state or overview</p>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink href={`${basePath}/app/synthetics/monitors`}>Monitors</EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink href={`${basePath}/app/synthetics/add-monitor`}>Add Monitor</EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
