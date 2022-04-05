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

import { HeaderSection } from '../../../../common/components/header_section';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import * as i18n from '../translations';
import { SEVERITY_COLOR } from '../util';
import { AlertSeverityCounts, useUserAlertsItems } from './user_alerts_items';

const tableColumns: Array<EuiBasicTableColumn<AlertSeverityCounts>> = [
  {
    field: 'userName',
    name: i18n.USER_ALERTS_USERNAME_COLUMN,
    truncateText: true,
    textOnly: true,

    render: (hostName: string) => (
      <EuiLink
        data-test-subj="userSeverityAlertsTable-hostName"
        href={`/app/security/rules/id/${hostName}`}
      >
        {hostName}
      </EuiLink>
    ),
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_COLUMN,
    render: (totalAlerts: number, { userName }) => (
      <EuiLink
        data-test-subj="userSeverityAlertsTable-totalAlerts"
        href={`/app/security/rules/id/${userName}`}
      >
        {totalAlerts}
      </EuiLink>
    ),
  },
  {
    field: 'critical',
    name: i18n.SEVERITY_CRITICAL_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-critical" color={SEVERITY_COLOR.critical}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'high',
    name: i18n.SEVERITY_HIGH_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-high" color={SEVERITY_COLOR.high}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'medium',
    name: i18n.SEVERITY_MEDIUM_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-medium" color={SEVERITY_COLOR.medium}>
        {count}
      </EuiHealth>
    ),
  },
  {
    field: 'low',
    name: i18n.SEVERITY_LOW_COLUMN,
    render: (count: number) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-low" color={SEVERITY_COLOR.low}>
        {count}
      </EuiHealth>
    ),
  },
];

export const UserAlertsTable = React.memo(() => {
  const { to, from } = useGlobalTime();
  const { data, isLoading } = useUserAlertsItems({ to, from });

  return (
    <EuiPanel hasBorder data-test-subj="userSeverityAlertsPanel">
      <HeaderSection
        id={data.id}
        title={'Vulnerable users by severity'}
        titleSize="s"
        hideSubtitle
      />
      {isLoading || data.counters.length > 0 ? (
        <>
          <EuiBasicTable
            data-test-subj="userAlertsTable"
            columns={tableColumns}
            items={data.counters}
            loading={isLoading}
            noItemsMessage={<>{'No alerts found'}</> /** TODO */}
          />
          <EuiSpacer size="m" />
          <EuiButton
            onClick={() => {
              console.log('redirect');
            }}
          >
            {i18n.VIEW_ALL_USER_ALERTS}
          </EuiButton>
        </>
      ) : (
        <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
      )}
    </EuiPanel>
  );
});
UserAlertsTable.displayName = 'UserAlertsTable';
