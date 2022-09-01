/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedCount } from '../../../../common/components/formatted_number';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import { HostDetailsLink } from '../../../../common/components/links';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useNavigateToTimeline } from '../hooks/use_navigate_to_timeline';
import * as i18n from '../translations';
import { ITEMS_PER_PAGE, LastUpdatedAt, SEVERITY_COLOR } from '../utils';
import type { HostAlertsItem } from './use_host_alerts_items';
import { useHostAlertsItems } from './use_host_alerts_items';

interface HostAlertsTableProps {
  signalIndexName: string | null;
}

type GetTableColumns = (
  handleClick: (params: { hostName: string; severity?: string }) => void
) => Array<EuiBasicTableColumn<HostAlertsItem>>;

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

export const HostAlertsTable = React.memo(({ signalIndexName }: HostAlertsTableProps) => {
  const { openHostInTimeline } = useNavigateToTimeline();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID
  );
  const { items, isLoading, updatedAt, pagination } = useHostAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID,
    signalIndexName,
  });

  const columns = useMemo(() => getTableColumns(openHostInTimeline), [openHostInTimeline]);

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="severityHostAlertsPanel">
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={i18n.HOST_ALERTS_SECTION_TITLE}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
          titleSize="s"
          toggleQuery={setToggleStatus}
          toggleStatus={toggleStatus}
          tooltip={i18n.HOST_TOOLTIP}
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
            {pagination.pageCount > 1 && (
              <EuiTablePagination
                data-test-subj="hostTablePaginator"
                activePage={pagination.currentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                pageCount={pagination.pageCount}
                onChangePage={pagination.setPage}
                showPerPageOptions={false}
              />
            )}
          </>
        )}
      </EuiPanel>
    </HoverVisibilityContainer>
  );
});

HostAlertsTable.displayName = 'HostAlertsTable';

const getTableColumns: GetTableColumns = (handleClick) => [
  {
    field: 'hostName',
    name: i18n.HOST_ALERTS_HOSTNAME_COLUMN,
    'data-test-subj': 'hostSeverityAlertsTable-hostName',
    render: (hostName: string) => (
      <EuiToolTip
        title={i18n.OPEN_HOST_DETAIL_TOOLTIP}
        content={hostName}
        anchorClassName="eui-textTruncate"
      >
        <HostDetailsLink hostName={hostName} />
      </EuiToolTip>
    ),
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_TEXT,
    'data-test-subj': 'hostSeverityAlertsTable-totalAlerts',
    render: (totalAlerts: number, { hostName }) => (
      <EuiLink disabled={totalAlerts === 0} onClick={() => handleClick({ hostName })}>
        <FormattedCount count={totalAlerts} />
      </EuiLink>
    ),
  },
  {
    field: 'critical',
    name: i18n.STATUS_CRITICAL_LABEL,
    render: (count: number, { hostName }) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-critical" color={SEVERITY_COLOR.critical}>
        <EuiLink
          disabled={count === 0}
          onClick={() => handleClick({ hostName, severity: 'critical' })}
        >
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
  {
    field: 'high',
    name: i18n.STATUS_HIGH_LABEL,
    render: (count: number, { hostName }) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-high" color={SEVERITY_COLOR.high}>
        <EuiLink disabled={count === 0} onClick={() => handleClick({ hostName, severity: 'high' })}>
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
  {
    field: 'medium',
    name: i18n.STATUS_MEDIUM_LABEL,
    render: (count: number, { hostName }) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-medium" color={SEVERITY_COLOR.medium}>
        <EuiLink
          disabled={count === 0}
          onClick={() => handleClick({ hostName, severity: 'medium' })}
        >
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
  {
    field: 'low',
    name: i18n.STATUS_LOW_LABEL,
    render: (count: number, { hostName }) => (
      <EuiHealth data-test-subj="hostSeverityAlertsTable-low" color={SEVERITY_COLOR.low}>
        <EuiLink disabled={count === 0} onClick={() => handleClick({ hostName, severity: 'low' })}>
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
];
