/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useCallback } from 'react';
import { type Criteria, EuiBasicTable, formatDate, EuiEmptyPrompt } from '@elastic/eui';

import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { isRight } from 'fp-ts/lib/Either';
import { ALERT_REASON, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { SeverityBadge } from '../../../detections/components/rules/severity_badge';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';
import { ERROR_MESSAGE, ERROR_TITLE } from '../../shared/translations';
import * as i18n from './translations';

export const TIMESTAMP_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

export const columns = [
  {
    field: '@timestamp',
    name: i18n.CORRELATIONS_TIMESTAMP_COLUMN_TITLE,
    truncateText: true,
    dataType: 'date' as const,
    render: (value: string) => formatDate(value, TIMESTAMP_DATE_FORMAT),
  },
  {
    field: ALERT_RULE_NAME,
    name: i18n.CORRELATIONS_RULE_COLUMN_TITLE,
    truncateText: true,
  },
  {
    field: ALERT_REASON,
    name: i18n.CORRELATIONS_REASON_COLUMN_TITLE,
    truncateText: true,
  },
  {
    field: 'kibana.alert.severity',
    name: i18n.CORRELATIONS_SEVERITY_COLUMN_TITLE,
    truncateText: true,
    render: (value: string) => {
      const decodedSeverity = Severity.decode(value);
      return isRight(decodedSeverity) ? <SeverityBadge value={decodedSeverity.right} /> : value;
    },
  },
];

export interface AlertsTableProps {
  /**
   * Ids of alerts to display in the table
   */
  alertIds: string[];
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Renders paginated alert array based on the provided alertIds
 */
export const AlertsTable: FC<AlertsTableProps> = ({ alertIds, 'data-test-subj': dataTestSubj }) => {
  const { setPagination, setSorting, data, loading, paginationConfig, sorting, error } =
    usePaginatedAlerts(alertIds);

  const onTableChange = useCallback(
    ({ page, sort }: Criteria<Record<string, unknown>>) => {
      if (page) {
        const { index: pageIndex, size: pageSize } = page;
        setPagination({ pageIndex, pageSize });
      }

      if (sort) {
        setSorting(sort);
      }
    },
    [setPagination, setSorting]
  );

  const mappedData = useMemo(() => {
    return data
      .map((hit) => hit.fields)
      .map((fields = {}) =>
        Object.keys(fields).reduce((result, fieldName) => {
          result[fieldName] = fields?.[fieldName]?.[0] || fields?.[fieldName];
          return result;
        }, {} as Record<string, unknown>)
      );
  }, [data]);

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE('alert data')}</h2>}
        body={<p>{ERROR_MESSAGE('alert data')}</p>}
        data-test-subj={`${dataTestSubj}Error`}
      />
    );
  }

  return (
    <EuiBasicTable<Record<string, unknown>>
      data-test-subj={dataTestSubj}
      loading={loading}
      items={mappedData}
      columns={columns}
      pagination={paginationConfig}
      sorting={sorting}
      onChange={onTableChange}
    />
  );
};
