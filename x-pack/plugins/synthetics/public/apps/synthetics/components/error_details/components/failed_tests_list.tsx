/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { MouseEvent, useState } from 'react';
import { EuiBasicTable, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { useKibanaDateFormat } from '../../../../../hooks/use_kibana_date_format';
import { Ping } from '../../../../../../common/runtime_types';
import {
  formatTestDuration,
  formatTestRunAt,
} from '../../../utils/monitor_test_result/test_time_formats';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const FailedTestsList = ({
  failedTests,
  loading,
}: {
  failedTests: Ping[];
  loading?: boolean;
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('@timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { monitorId } = useParams<{ monitorId: string }>();

  const items = failedTests.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  const { basePath } = useSyntheticsSettingsContext();

  const history = useHistory();

  const format = useKibanaDateFormat();

  const columns = [
    {
      field: '@timestamp',
      name: TIMESTAMP_LABEL,
      sortable: true,
      render: (value: string, item: Ping) => {
        return (
          <EuiLink
            href={`${basePath}/app/synthetics/monitor/${monitorId}/test-run/${item.monitor.check_group}`}
          >
            {formatTestRunAt(value, format)}
          </EuiLink>
        );
      },
    },
    {
      field: 'monitor.duration.us',
      name: MONITOR_DURATION_LABEL,
      align: 'right' as const,
      render: (value: number) => <EuiText>{formatTestDuration(value)}</EuiText>,
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: failedTests.length,
    pageSizeOptions: [3, 5, 8],
  };

  const getRowProps = (item: Ping) => {
    const { state } = item;
    if (state?.id) {
      return {
        'data-test-subj': `row-${state.id}`,
        onClick: (evt: MouseEvent) => {
          history.push(`/monitor/${monitorId}/test-run/${item.monitor.check_group}`);
        },
      };
    }
  };

  return (
    <div>
      <EuiSpacer />
      <EuiBasicTable
        tableCaption={ERRORS_LIST_LABEL}
        loading={loading}
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={{
          sort: {
            field: sortField as keyof Ping,
            direction: sortDirection,
          },
        }}
        onChange={({ page = {}, sort = {} }) => {
          const { index: pIndex, size: pSize } = page;

          const { field: sField, direction: sDirection } = sort;

          setPageIndex(pIndex!);
          setPageSize(pSize!);
          setSortField(sField!);
          setSortDirection(sDirection!);
        }}
        rowProps={getRowProps}
      />
    </div>
  );
};

const ERRORS_LIST_LABEL = i18n.translate('xpack.synthetics.errorsList.label', {
  defaultMessage: 'Errors list',
});

const MONITOR_DURATION_LABEL = i18n.translate('xpack.synthetics.testDuration.label', {
  defaultMessage: 'Test duration',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.synthetics.timestamp.label', {
  defaultMessage: '@timestamp',
});
