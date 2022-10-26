/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { MouseEvent, useMemo, useState } from 'react';
import { EuiBasicTable, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useKibanaDateFormat } from '../../../../../hooks/use_kibana_date_format';
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
  const [sortField, setSortField] = useState('@timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const format = useKibanaDateFormat();

  const columns = [
    {
      field: '@timestamp',
      name: TIMESTAMP_LABEL,
      sortable: true,
      render: (value: string, item: Ping) => {
        return (
          <EuiLink href={`${basePath}/app/synthetics/error-details/${item.state?.id}`}>
            {formatTestRunAt(item.state!.started_at, format)}
          </EuiLink>
        );
      },
    },
    {
      field: 'monitor.check_group',
      name: !isBrowserType ? ERROR_MESSAGE_LABEL : FAILED_STEP_LABEL,
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
      name: ERROR_DURATION_LABEL,
      align: 'right' as const,
      render: (value: number) => <EuiText>{formatTestDuration(value, true)}</EuiText>,
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

const ERROR_DURATION_LABEL = i18n.translate('xpack.synthetics.errorDuration.label', {
  defaultMessage: 'Error duration',
});

const ERROR_MESSAGE_LABEL = i18n.translate('xpack.synthetics.errorMessage.label', {
  defaultMessage: 'Error message',
});

const FAILED_STEP_LABEL = i18n.translate('xpack.synthetics.failedStep.label', {
  defaultMessage: 'Failed step',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.synthetics.timestamp.label', {
  defaultMessage: '@timestamp',
});
