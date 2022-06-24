/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import moment, { Duration } from 'moment';
import { padStart, chunk } from 'lodash';
import { EuiHealth, EuiBasicTable, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import { Pagination } from '../../../../types';
import { AlertListItemStatus, AlertListItem } from './types';
import { AlertMutedSwitch } from './alert_muted_switch';

const durationAsString = (duration: Duration): string => {
  return [duration.hours(), duration.minutes(), duration.seconds()]
    .map((value) => padStart(`${value}`, 2, '0'))
    .join(':');
};

const alertsTableColumns = (
  onMuteAction: (alert: AlertListItem) => Promise<void>,
  readOnly: boolean
) => [
  {
    field: 'alert',
    name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.Alert', {
      defaultMessage: 'Alert',
    }),
    sortable: false,
    truncateText: true,
    width: '45%',
    'data-test-subj': 'alertsTableCell-alert',
    render: (value: string) => {
      return (
        <EuiToolTip anchorClassName={'eui-textTruncate'} content={value}>
          <span>{value}</span>
        </EuiToolTip>
      );
    },
  },
  {
    field: 'status',
    name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.status', {
      defaultMessage: 'Status',
    }),
    width: '15%',
    render: (value: AlertListItemStatus) => {
      return (
        <EuiHealth color={value.healthColor} className="alertsList__health">
          {value.label}
          {value.actionGroup ? ` (${value.actionGroup})` : ``}
        </EuiHealth>
      );
    },
    sortable: false,
    'data-test-subj': 'alertsTableCell-status',
  },
  {
    field: 'start',
    width: '190px',
    render: (value: Date | undefined) => {
      return value ? moment(value).format('D MMM YYYY @ HH:mm:ss') : '';
    },
    name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.start', {
      defaultMessage: 'Start',
    }),
    sortable: false,
    'data-test-subj': 'alertsTableCell-start',
  },
  {
    field: 'duration',
    render: (value: number) => {
      return value ? durationAsString(moment.duration(value)) : '';
    },
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.duration',
      { defaultMessage: 'Duration' }
    ),
    sortable: false,
    width: '80px',
    'data-test-subj': 'alertsTableCell-duration',
  },
  {
    field: '',
    align: RIGHT_ALIGNMENT,
    width: '60px',
    name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.mute', {
      defaultMessage: 'Mute',
    }),
    render: (alert: AlertListItem) => {
      return (
        <AlertMutedSwitch
          disabled={readOnly}
          onMuteAction={async () => await onMuteAction(alert)}
          alert={alert}
        />
      );
    },
    sortable: false,
    'data-test-subj': 'alertsTableCell-actions',
  },
];

interface RuleAlertListProps {
  items: AlertListItem[];
  readOnly: boolean;
  onMuteAction: (alert: AlertListItem) => Promise<void>;
}

const getRowProps = () => ({
  'data-test-subj': 'alert-row',
});

const getCellProps = () => ({
  'data-test-subj': 'cell',
});

function getPage<T>(items: T[], pagination: Pagination) {
  return chunk(items, pagination.size)[pagination.index] || [];
}

export const RuleAlertList = (props: RuleAlertListProps) => {
  const { items, readOnly, onMuteAction } = props;

  const [pagination, setPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });

  const pageOfAlerts = getPage<AlertListItem>(items, pagination);

  const paginationOptions = useMemo(() => {
    return {
      pageIndex: pagination.index,
      pageSize: pagination.size,
      totalItemCount: items.length,
    };
  }, [pagination, items]);

  const onChange = useCallback(
    ({ page: changedPage }: { page: Pagination }) => {
      setPagination(changedPage);
    },
    [setPagination]
  );

  return (
    <EuiBasicTable<AlertListItem>
      items={pageOfAlerts}
      pagination={paginationOptions}
      onChange={onChange}
      rowProps={getRowProps}
      cellProps={getCellProps}
      columns={alertsTableColumns(onMuteAction, readOnly)}
      data-test-subj="alertsList"
      tableLayout="fixed"
      className="alertsList"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAlertList as default };
