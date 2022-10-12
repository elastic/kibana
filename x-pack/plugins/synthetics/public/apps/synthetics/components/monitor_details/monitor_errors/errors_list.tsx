/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useMemo, useState } from 'react';
import { EuiBasicTable, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { Ping } from '../../../../../../common/runtime_types';
import { useErrorFailedStep } from '../hooks/use_error_failed_step';
import {
  formatTestDuration,
  formatTestRunAt,
} from '../../../utils/monitor_test_result/test_time_formats';
import { useMonitorErrors } from '../hooks/use_monitor_errors';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const ErrorsList = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('state.started_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { errorStates, loading } = useMonitorErrors();

  const items = errorStates.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  const checkGroups = useMemo(() => {
    const currentPage = errorStates.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

    return currentPage.map((error) => error.monitor.check_group!);
  }, [errorStates, pageIndex, pageSize]);

  const { failedSteps } = useErrorFailedStep(checkGroups);

  const isBrowserType = errorStates[0]?.monitor.type === 'browser';

  const { basePath } = useSyntheticsSettingsContext();

  const history = useHistory();

  const columns = [
    {
      field: 'state.started_at',
      name: '@timestamp',
      sortable: true,
      truncateText: true,
      render: (value: string, item: Ping) => {
        return (
          <EuiLink href={`${basePath}/app/synthetics/error-details/${item.state?.id}`}>
            {formatTestRunAt(value)}
          </EuiLink>
        );
      },
    },
    {
      field: 'monitor.check_group',
      name: !isBrowserType ? 'Error message' : 'Failed step',
      truncateText: true,
      render: (value: string, item: Ping) => {
        if (!isBrowserType) {
          return <EuiText size="s">{item.error?.message ?? '--'}</EuiText>;
        }
        const failedStep = failedSteps.find((step) => step.monitor.check_group === value);
        if (!failedStep) {
          return <>--</>;
        }
        return (
          <EuiText size="s">
            {failedStep.synthetics?.step?.index}. {failedStep.synthetics?.step?.name}
          </EuiText>
        );
      },
    },
    {
      field: 'state.duration_ms',
      name: 'Error duration',
      align: 'right' as const,
      render: (value: number) => <EuiText>{formatTestDuration(value)}</EuiText>,
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: errorStates.length,
    pageSizeOptions: [3, 5, 8],
  };

  const getRowProps = (item: Ping) => {
    const { state } = item;
    if (state?.id) {
      return {
        height: '85px',
        'data-test-subj': `row-${state.id}`,
        onClick: (evt: MouseEvent) => {
          history.push(`/error-details/${state.id}`);
        },
      };
    }
  };

  return (
    <div>
      <EuiSpacer />
      <EuiBasicTable
        tableCaption="Demo for EuiBasicTable with sorting"
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
