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
import { HostDetailsLink } from '../../../../common/components/links';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useNavigation, NavigateTo, GetAppUrl } from '../../../../common/lib/kibana';
import * as i18n from '../translations';
import { LastUpdatedAt, SEVERITY_COLOR } from '../util';
import { HostAlertsItem, useHostAlertsItems } from './use_host_alerts_items';

type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
}) => Array<EuiBasicTableColumn<HostAlertsItem>>;

interface HostAlertsTableProps {
  signalIndexName: string | null;
}

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

export const HostAlertsTable = React.memo(({ signalIndexName }: HostAlertsTableProps) => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID
  );

  const { items, isLoading, updatedAt } = useHostAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID,
    signalIndexName,
  });

  const navigateToHosts = useCallback(() => {
    navigateTo({ deepLinkId: SecurityPageName.hosts });
  }, [navigateTo]);

  const columns = useMemo(
    () => getTableColumns({ getAppUrl, navigateTo }),
    [getAppUrl, navigateTo]
  );

  return (
    <EuiPanel hasBorder data-test-subj="severityHostAlertsPanel">
      <HeaderSection
        id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
        title={i18n.HOST_ALERTS_SECTION_TITLE}
        subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        titleSize="s"
        toggleQuery={setToggleStatus}
        toggleStatus={toggleStatus}
      />
      {toggleStatus && (
        <>
          <EuiBasicTable
            items={items}
            columns={columns}
            loading={isLoading}
            data-test-subj="severityHostAlertsTable"
            noItemsMessage={
              <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
            }
          />
          <EuiSpacer size="m" />
          <EuiButton data-test-subj="severityHostAlertsButton" onClick={navigateToHosts}>
            {i18n.VIEW_ALL_HOST_ALERTS}
          </EuiButton>
        </>
      )}
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
    render: (hostName: string) => <HostDetailsLink hostName={hostName} />,
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_COLUMN,
    render: (totalAlerts: number) => (
      <div data-test-subj="hostSeverityAlertsTable-totalAlerts">{totalAlerts}</div>
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
