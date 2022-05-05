/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useSyntheticsSettingsContext } from '../../contexts';
import { useOverviewBreadcrumbs } from './use_breadcrumbs';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();
  const { basePath } = useSyntheticsSettingsContext();

  return (
    <EuiFlexGroup direction={'column'}>
      <EuiFlexItem>
        <p>This page should show empty state or overview</p>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink href={`${basePath}/app/synthetics/manage-monitors`}>Monitor Management</EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink href={`${basePath}/app/synthetics/add-monitor`}>Add Monitor</EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
