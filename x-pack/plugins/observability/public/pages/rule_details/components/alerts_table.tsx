/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { padStart } from 'lodash';
import { EuiBasicTable, EuiHealth, EuiHorizontalRule, EuiToolTip } from '@elastic/eui';
import moment, { Duration } from 'moment';
import { i18n } from '@kbn/i18n';

import { AlertListItem, AlertListItemStatus } from '../types';

interface AlertsTableProps {
  items: AlertListItem[];
}

export function AlertsTable({ items }: AlertsTableProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showPerPageOptions, setShowPerPageOptions] = useState(true);
  const totalItemCount = 2;
  const onTableChange = ({ page = {} }) => {
    // const { index: pageIndex, size: pageSize } = page;

    setPageIndex(pageIndex);
    setPageSize(pageSize);
  };

  // cosnst { pageOfItems, totalItemCount } = buildItem();
  const durationAsString = (duration: Duration): string => {
    return [duration.hours(), duration.minutes(), duration.seconds()]
      .map((value) => padStart(`${value}`, 2, '0'))
      .join(':');
  };

  const columns = [
    {
      field: 'alert',
      name: i18n.translate('xpack.observability.ruleDetails.alertsList.columns.Alert', {
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
      name: i18n.translate('xpack.observability.ruleDetails.alertsList.columns.status', {
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
      name: i18n.translate('xpack.observability.ruleDetails.alertsList.columns.start', {
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
      name: i18n.translate('xpack.observability.ruleDetails.alertsList.columns.duration', {
        defaultMessage: 'Duration',
      }),
      sortable: false,
      width: '80px',
      'data-test-subj': 'alertsTableCell-duration',
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 0],
    showPerPageOptions,
  };

  return (
    <div>
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        tableCaption="Alerts table"
        items={items ?? []}
        columns={columns}
        pagination={pagination}
        onChange={onTableChange}
      />
    </div>
  );
}
