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
  EuiEmptyPrompt,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import React from 'react';

import { useNavigation } from '../../../../common/lib/kibana';
import { HeaderSection } from '../../../../common/components/header_section';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import * as i18n from '../translations';
import { SEVERITY_COLOR } from '../util';
import { AlertSeverityCounts, useHostAlertsItems } from './host_alerts_items';

const tableColumns: Array<EuiBasicTableColumn<AlertSeverityCounts>> = [
  {
    field: 'hostName',
    name: i18n.HOST_ALERTS_HOSTNAME_COLUMN,
    truncateText: true,
    textOnly: true,
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
    name: i18n.ALERTS_COLUMN,
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
    name: i18n.SEVERITY_CRITICAL_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-critical" color={SEVERITY_COLOR.critical}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'high',
    name: i18n.SEVERITY_HIGH_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-high" color={SEVERITY_COLOR.high}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'medium',
    name: i18n.SEVERITY_MEDIUM_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-medium" color={SEVERITY_COLOR.medium}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'low',
    name: i18n.SEVERITY_LOW_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-low" color={SEVERITY_COLOR.low}>
        {count}
      </EuiHealth>
    ),
  },
];

export const HostAlertsTable = React.memo(() => {
  const { to, from } = useGlobalTime();
  const { navigateTo } = useNavigation();
  const { data, isLoading } = useHostAlertsItems({ to, from });

  return (
    <EuiPanel hasBorder data-test-subj="hostSeverityAlertsPanel">
      <HeaderSection
        id={data.id}
        title={i18n.HOST_ALERTS_SECTION_TITLE}
        titleSize="s"
        hideSubtitle
      />
      {isLoading || data.counters.length > 0 ? (
        <>
          <EuiBasicTable
            data-test-subj="hostAlertsTable"
            columns={tableColumns}
            items={data.counters}
            loading={isLoading}
          />
          <EuiSpacer size="m" />
          <EuiButton onClick={() => navigateTo({ url: 'how to form this' })}>
            {i18n.VIEW_ALL_HOST_ALERTS}
          </EuiButton>
        </>
      ) : (
        <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
      )}
    </EuiPanel>
  );
});
HostAlertsTable.displayName = 'HostAlertsTable';
