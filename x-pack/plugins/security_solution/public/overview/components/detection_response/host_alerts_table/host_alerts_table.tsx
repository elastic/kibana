/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiHealth,
  EuiLink,
  EuiPanel,
} from '@elastic/eui';

import React from 'react';

import { HeaderSection } from '../../../../common/components/header_section';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { SEVERITY_COLOR } from '../util';
import { AlertSeverityCounts, useHostAlertsItems } from './host_alerts_items';

const tableColumns: Array<EuiBasicTableColumn<AlertSeverityCounts>> = [
  {
    field: 'hostName',
    name: 'Host name',
    render: (hostName: string) => (
      <EuiLink
        data-test-subj="hostSeverityAlertsTable-hostName"
        href={`/app/security/rules/id/${hostName}`}
      >
        {hostName}
      </EuiLink>
    ),
  },
  {
    field: 'totalAlerts',
    name: 'Alerts',
    render: (totalAlerts: number, { hostName }) => (
      <EuiLink
        data-test-subj="hostSeverityAlertsTable-totalAlerts"
        href={`/app/security/rules/id/${hostName}`}
      >
        {totalAlerts}
      </EuiLink>
    ),
  },
  {
    field: 'critical',
    name: 'Critical',
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-critical" color={SEVERITY_COLOR.critical}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'high',
    name: 'High',
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-high" color={SEVERITY_COLOR.high}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'medium',
    name: 'Medium',
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-medium" color={SEVERITY_COLOR.medium}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'low',
    name: 'Low',
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-low" color={SEVERITY_COLOR.low}>
        {count}
      </EuiHealth>
    ),
  },
];

export const HostAlertsTable = React.memo(() => {
  const { to, from } = useGlobalTime();
  const { data, isLoading } = useHostAlertsItems({ to, from });

  return (
    <EuiPanel hasBorder data-test-subj="hostSeverityAlertsPanel">
      <HeaderSection
        id={data.id}
        title={'Vulnerable hosts by severity'}
        titleSize="s"
        hideSubtitle
      />
      <EuiBasicTable
        data-test-subj="hostAlertsTable"
        columns={tableColumns}
        items={data.counters}
        loading={isLoading}
        noItemsMessage={<>{'No alerts found'}</> /** TODO */}
      />
      <EuiButton onClick={onViewAllHostAlerts}>{'View all other host alerts'}</EuiButton>
    </EuiPanel>
  );

  function onViewAllHostAlerts() {}
});
HostAlertsTable.displayName = 'HostAlertsTable';
