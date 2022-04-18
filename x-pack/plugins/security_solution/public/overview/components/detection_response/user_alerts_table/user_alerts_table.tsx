/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiEmptyPrompt,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { SecurityPageName } from '../../../../app/types';
import { HeaderSection } from '../../../../common/components/header_section';
import { UserDetailsLink } from '../../../../common/components/links';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useNavigation, NavigateTo, GetAppUrl } from '../../../../common/lib/kibana';
import * as i18n from '../translations';
import { LastUpdatedAt, SEVERITY_COLOR } from '../util';
import { UserAlertsItem, useUserAlertsItems } from './use_user_alerts_items';

export interface UserAlertsTableProps {
  signalIndexName: string | null;
}

type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
}) => Array<EuiBasicTableColumn<UserAlertsItem>>;

const DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID = 'vulnerableUsersBySeverityQuery';

export const UserAlertsTable = React.memo(({ signalIndexName }: UserAlertsTableProps) => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID
  );
  const { items, isLoading, updatedAt } = useUserAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID,
    signalIndexName,
  });

  const navigateToAlerts = useCallback(() => {
    navigateTo({ deepLinkId: SecurityPageName.users });
  }, [navigateTo]);

  const columns = useMemo(
    () => getTableColumns({ getAppUrl, navigateTo }),
    [getAppUrl, navigateTo]
  );

  return (
    <EuiPanel hasBorder data-test-subj="severityUserAlertsPanel">
      <HeaderSection
        id={DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID}
        title={i18n.USER_ALERTS_SECTION_TITLE}
        titleSize="s"
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
      />

      {toggleStatus && (
        <>
          <EuiBasicTable
            data-test-subj="severityUserAlertsTable"
            columns={columns}
            items={items}
            loading={isLoading}
            noItemsMessage={
              <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
            }
          />
          <EuiSpacer size="m" />
          <EuiButton data-test-subj="severityUserAlertsButton" onClick={navigateToAlerts}>
            {i18n.VIEW_ALL_USER_ALERTS}
          </EuiButton>
        </>
      )}
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

    render: (userName: string) => (
      <UserDetailsLink data-test-subj="userSeverityAlertsTable-userName" userName={userName} />
    ),
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_COLUMN,
    render: (totalAlerts: number, { userName }) => <div>{totalAlerts}</div>,
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
