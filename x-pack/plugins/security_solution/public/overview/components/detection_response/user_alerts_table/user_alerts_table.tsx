/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */ // we need both to allow a user to right click and open in new a tab or click and navigate within the app without forcing a reload of the application

import React, { useMemo } from 'react';

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

import { SecurityPageName } from '../../../../app/types';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useNavigation, NavigateTo, GetAppUrl } from '../../../../common/lib/kibana';
import * as i18n from '../translations';
import { SEVERITY_COLOR } from '../util';
import { AlertSeverityCounts, useUserAlertsItems } from './user_alerts_items';

type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
}) => Array<EuiBasicTableColumn<AlertSeverityCounts>>;

const DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID = 'vulnerableUsersBySeverityQuery';

export const UserAlertsTable = React.memo(() => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID
  );
  const { data, isLoading } = useUserAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID,
  });

  const columns = useMemo(
    () => getTableColumns({ getAppUrl, navigateTo }),
    [getAppUrl, navigateTo]
  );

  return (
    <EuiPanel hasBorder data-test-subj="userSeverityAlertsPanel">
      <HeaderSection
        id={DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID}
        title={i18n.USER_ALERTS_SECTION_TITLE}
        titleSize="s"
        hideSubtitle
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
      />

      {toggleStatus &&
        (isLoading || data.length > 0 ? (
          <>
            <EuiBasicTable
              data-test-subj="userAlertsTable"
              columns={columns}
              items={data}
              loading={isLoading}
              noItemsMessage={<>{'No alerts found'}</> /** TODO */}
            />
            <EuiSpacer size="m" />
            <EuiButton
              onClick={() => navigateTo({ url: getAppUrl({ deepLinkId: SecurityPageName.users }) })}
            >
              {i18n.VIEW_ALL_USER_ALERTS}
            </EuiButton>
          </>
        ) : (
          <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
        ))}
    </EuiPanel>
  );
});

UserAlertsTable.displayName = 'UserAlertsTable';

const getTableColumns: GetTableColumns = ({ getAppUrl, navigateTo }) => [
  {
    field: 'userName',
    name: i18n.USER_ALERTS_USERNAME_COLUMN,
    truncateText: true,
    textOnly: true,

    render: (userName: string) => {
      const url = getAppUrl({ deepLinkId: SecurityPageName.users, path: userName });

      return (
        <EuiLink
          data-test-subj="userSeverityAlertsTable-userName"
          href={`/app/security/users/${userName}`}
          onClick={(ev?: React.MouseEvent) => {
            if (ev) {
              ev.preventDefault();
            }
            navigateTo({ url });
          }}
        >
          {userName}
        </EuiLink>
      );
    },
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_COLUMN,
    render: (totalAlerts: number, { userName }) => {
      const url = getAppUrl({ deepLinkId: SecurityPageName.users, path: userName });

      return (
        <EuiLink
          data-test-subj="userSeverityAlertsTable-totalAlerts"
          href={`/app/security/users/id/${userName}`}
          onClick={(ev?: React.MouseEvent) => {
            if (ev) {
              ev.preventDefault();
            }
            navigateTo({ url });
          }}
        >
          {totalAlerts}
        </EuiLink>
      );
    },
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
