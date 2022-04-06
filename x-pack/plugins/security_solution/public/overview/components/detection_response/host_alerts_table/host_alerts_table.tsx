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
import { AlertSeverityCounts, useHostAlertsItems } from './host_alerts_items';

type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
}) => Array<EuiBasicTableColumn<AlertSeverityCounts>>;

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

export const HostAlertsTable = React.memo(() => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID
  );

  const { data, isLoading } = useHostAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID,
  });

  const columns = useMemo(
    () => getTableColumns({ getAppUrl, navigateTo }),
    [getAppUrl, navigateTo]
  );

  return (
    <EuiPanel hasBorder data-test-subj="hostSeverityAlertsPanel">
      <HeaderSection
        id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
        title={i18n.HOST_ALERTS_SECTION_TITLE}
        titleSize="s"
        hideSubtitle
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
      />
      {toggleStatus &&
        (isLoading || data.length > 0 ? (
          <>
            <EuiBasicTable
              data-test-subj="hostAlertsTable"
              columns={columns}
              items={data}
              loading={isLoading}
            />
            <EuiSpacer size="m" />
            <EuiButton onClick={() => console.log('TO DO Where to link ')}>
              {i18n.VIEW_ALL_HOST_ALERTS}
            </EuiButton>
          </>
        ) : (
          <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
        ))}
    </EuiPanel>
  );
});

HostAlertsTable.displayName = 'HostAlertsTable';

const getTableColumns: GetTableColumns = ({ getAppUrl, navigateTo }) => [
  {
    field: 'hostName',
    name: i18n.HOST_ALERTS_HOSTNAME_COLUMN,
    truncateText: true,
    textOnly: true,
    render: (hostName: string) => {
      const url = getAppUrl({ deepLinkId: SecurityPageName.hosts, path: hostName });

      return (
        <EuiLink
          data-test-subj="userSeverityAlertsTable-hostName"
          href={`/app/security/hosts/${hostName}`}
          onClick={(ev?: React.MouseEvent) => {
            if (ev) {
              ev.preventDefault();
            }
            navigateTo({ url });
          }}
        >
          {hostName}
        </EuiLink>
      );
    },
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_COLUMN,
    render: (totalAlerts: number, { hostName }) => {
      const url = getAppUrl({ deepLinkId: SecurityPageName.hosts, path: hostName });

      return (
        <EuiLink
          data-test-subj="hostSeverityAlertsTable-totalAlerts"
          href={`/app/security/hosts/${hostName}`}
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
