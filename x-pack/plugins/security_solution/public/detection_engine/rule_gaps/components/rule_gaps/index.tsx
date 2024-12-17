/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  INTERNAL_ALERTING_GAPS_FIND_API_PATH,
  INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH,
} from '@kbn/alerting-plugin/common';
import styled from 'styled-components';
import React, { useCallback, useState } from 'react';
import dateMath from '@kbn/datemath';
import type { CriteriaWithPagination, EuiBasicTableColumn, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBetaBadge,
  EuiProgress,
  EuiText,
  EuiHealth,
  EuiButtonEmpty,
  EuiSuperDatePicker,
} from '@elastic/eui';

const DatePickerEuiFlexItem = styled(EuiFlexItem)`
  max-width: 582px;
`;

import type { FindGapsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/find';

import type { FillGapByIdResponseV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/fill';
import type { IHttpFetchError } from '@kbn/core/public';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useUserData } from '../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';

import { BETA, BETA_TOOLTIP } from '../../../../common/translations';

import { HeaderSection } from '../../../../common/components/header_section';
import { TableHeaderTooltipCell } from '../../../rule_management_ui/components/rules_table/table_header_tooltip_cell';

import { FormattedDate } from '../../../../common/components/formatted_date';
import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import { getFormattedDuration } from '../../../rule_details_ui/pages/rule_details/execution_log_table/rule_duration_format';
import * as i18n from './translations';

export type Gap = FindGapsResponseBody['data']['0'];
export type GapStatus = Gap['status'];

const FIND_GAPS_FOR_RULE = 'FIND_GAP_FOR_RULE';

/**
 * Find gaps for the given rule ID
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const findGapsForRule = async ({
  ruleId,
  page,
  perPage,
  signal,
  sortField = 'createdAt',
  sortOrder = 'desc',
  start,
  end,
}: {
  ruleId: string;
  page: number;
  perPage: number;
  signal?: AbortSignal;
  sortField?: string;
  sortOrder?: string;
}): Promise<FindGapsResponseBody> => {
  const startDate = dateMath.parse(start);
  const endDate = dateMath.parse(end, { roundUp: true });

  return KibanaServices.get().http.fetch<FindGapsResponseBody>(
    INTERNAL_ALERTING_GAPS_FIND_API_PATH,
    {
      method: 'GET',
      query: {
        rule_id: ruleId,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
        start: startDate?.utc().toISOString(),
        end: endDate?.utc().toISOString(),
      },
      signal,
    }
  );
};

/**
 * Fill gap by Id for the given rule ID
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const fillGapByIdForRule = async ({
  ruleId,
  gapId,
  signal,
}: FillGapQuery & {
  signal?: AbortSignal;
}): Promise<FillGapByIdResponseV1> =>
  KibanaServices.get().http.fetch<FillGapByIdResponseV1>(
    INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH,
    {
      method: 'POST',
      query: {
        rule_id: ruleId,
        gap_id: gapId,
      },
      signal,
    }
  );

export const useInvalidateFindGapsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([FIND_GAPS_FOR_RULE], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useFindGapsForRule = (
  {
    ruleId,
    page,
    perPage,
    start,
    end,
  }: {
    ruleId: string;
    page: number;
    perPage: number;
    start: string;
    end: string;
  },
  options?: UseQueryOptions<FindGapsResponseBody>
) => {
  return useQuery<FindGapsResponseBody>(
    [FIND_GAPS_FOR_RULE, ruleId, page, perPage],
    async ({ signal }) => {
      const response = await findGapsForRule({ signal, ruleId, page, perPage, start, end });

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};

export const FILL_GAP_BY_ID_MUTATION_KEY = ['POST', INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH];

interface FillGapQuery {
  ruleId: string;
  gapId: string;
}
export const useFillGapMutation = (
  options?: UseMutationOptions<unknown, IHttpFetchError<Error>, FillGapQuery>
) => {
  const invalidateFindGapsQuery = useInvalidateFindGapsQuery();
  return useMutation((fillGapsOptions: FillGapQuery) => fillGapByIdForRule(fillGapsOptions), {
    ...options,
    onSettled: (...args) => {
      invalidateFindGapsQuery();
      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
    mutationKey: FILL_GAP_BY_ID_MUTATION_KEY,
  });
};

const FillGap = ({ ruleId, gap }: { ruleId: string; gap: Gap }) => {
  const { addSuccess, addError } = useAppToasts();
  const fillGapMutation = useFillGapMutation({
    onSuccess: () => {
      addSuccess(i18n.GAP_FILL_REQUEST_SUCCESS_MESSAGE, {
        toastMessage: i18n.GAP_FILL_REQUEST_SUCCESS_MESSAGE_TOOLTIP,
      });
    },
    onError: (error) => {
      addError(error, {
        title: i18n.GAP_FILL_REQUEST_ERROR_MESSAGE,
        toastMessage: error?.body?.message ?? error.message,
      });
    },
  });

  if (gap.status === 'filled' || gap.unfilled_intervals.length === 0) {
    return null;
  }

  const title =
    gap.in_progress_intervals.length > 0 || gap.filled_intervals.length > 0
      ? i18n.GAPS_TABLE_FILL_REMAINING_GAP_BUTTON_LABEL
      : i18n.GAPS_TABLE_FILL_GAP_BUTTON_LABEL;

  return (
    <>
      <EuiButtonEmpty
        isLoading={fillGapMutation.isLoading}
        isDisabled={fillGapMutation.isLoading}
        size="s"
        color="primary"
        onClick={() =>
          fillGapMutation.mutate({
            ruleId,
            gapId: gap._id,
          })
        }
      >
        {title}
      </EuiButtonEmpty>
    </>
  );
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'partially_filled':
      return i18n.GAP_STATUS_PARTIALLY_FILLED;
    case 'unfilled':
      return i18n.GAP_STATUS_UNFILLED;
    case 'filled':
      return i18n.GAP_STATUS_FILLED;
  }
  return '';
};

const getGapsTableColumns = (hasCRUDPermissions: boolean, ruleId: string) => {
  const fillActions = {
    name: i18n.GAPS_TABLE_ACTIONS_LABEL,
    align: 'right' as const,
    render: (gap: Gap) => <FillGap ruleId={ruleId} gap={gap} />,
    width: '15%',
  };

  const columns: Array<EuiBasicTableColumn<Gap>> = [
    {
      field: 'status',
      name: <TableHeaderTooltipCell title={i18n.GAPS_TABLE_STATUS_LABEL} tooltipContent="" />,
      render: (value: string) => getStatusLabel(value),
      width: '10%',
    },
    {
      field: 'in_progress_intervals',
      name: (
        <TableHeaderTooltipCell title={i18n.GAPS_TABLE_MANUAL_FILL_TASKS_LABEL} tooltipContent="" />
      ),
      render: (value: Gap['in_progress_intervals']) => {
        if (!value || !value.length) return null;
        return <EuiHealth color={'primary'}>{i18n.GAPS_TABLE_IN_PROGRESS_LABEL}</EuiHealth>;
      },
      width: '10%',
    },
    {
      width: '10%',
      align: 'right',
      name: (
        <TableHeaderTooltipCell
          title={i18n.GAPS_TABLE_EVENT_TIME_COVERED_LABEL}
          tooltipContent=""
        />
      ),
      render: (item: Gap) => {
        if (!item) return null;
        const value = Math.ceil((item.filled_duration_ms * 100) / item.total_gap_duration_ms);
        return (
          <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <p>
                  {value}
                  {'%'}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem style={{ maxWidth: '40px' }}>
              <EuiProgress value={value} max={100} size="xs" />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'range',
      name: <TableHeaderTooltipCell title={i18n.GAPS_TABLE_GAP_RANGE_LABEL} tooltipContent={''} />,
      render: (value: Gap['range']) => (
        <>
          <FormattedDate value={value?.gte} fieldName={'start'} />
          {' - '}
          <FormattedDate value={value?.lte} fieldName={'end'} />
        </>
      ),
      width: '40%',
    },
    {
      field: 'total_gap_duration_ms',
      name: (
        <TableHeaderTooltipCell title={i18n.GAPS_TABLE_GAP_DURATION_TOOLTIP} tooltipContent={''} />
      ),
      render: (value: Gap['total_gap_duration_ms']) => <>{getFormattedDuration(value)}</>,
      width: '10%',
    },
  ];

  if (hasCRUDPermissions) {
    columns.push(fillActions);
  }

  return columns;
};

const DEFAULT_PAGE_SIZE = 10;

export const RuleGaps = ({ ruleId }: { ruleId: string }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: 'now-24h',
    end: 'now',
  });
  const [{ canUserCRUD }] = useUserData();
  const { timelines } = useKibana().services;
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [isPaused, setIsPaused] = useState(true);

  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useFindGapsForRule({
    ruleId,
    page: pageIndex + 1,
    perPage: pageSize,
    start: dateRange.start,
    end: dateRange.end,
  });

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
  };

  const columns = getGapsTableColumns(hasCRUDPermissions, ruleId);

  const onRefreshCallback = () => {
    refetch();
  };

  const handleTableChange: (params: CriteriaWithPagination<Gap>) => void = ({ page }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const onTimeChangeCallback = useCallback(
    (props: OnTimeChangeProps) => {
      console.log('props', props);
      setDateRange({ start: props.start, end: props.end });
    },
    [setDateRange]
  );

  const onRefreshChangeCallback = useCallback(
    (props: OnRefreshChangeProps) => {
      setIsPaused(props.isPaused);
      // Only support auto-refresh >= 5s -- no current ability to limit within component
      setRefreshInterval(props.refreshInterval > 5000 ? props.refreshInterval : 5000);
    },
    [setIsPaused, setRefreshInterval]
  );

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" data-test-subj="rule-backfills-info">
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="s" alignItems="baseline">
            <HeaderSection title={'Gaps'} subtitle={'Rule gaps'} />
            <EuiBetaBadge label={BETA} tooltipContent={BETA_TOOLTIP} />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={true}>
          <DatePickerEuiFlexItem>
            <EuiSuperDatePicker
              start={dateRange.start}
              end={dateRange.end}
              onTimeChange={onTimeChangeCallback}
              onRefresh={onRefreshCallback}
              isPaused={isPaused}
              isLoading={isFetching}
              refreshInterval={refreshInterval}
              onRefreshChange={onRefreshChangeCallback}
              width="full"
            />
          </DatePickerEuiFlexItem>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {timelines.getLastUpdated({
            showUpdating: isLoading,
            updatedAt: dataUpdatedAt,
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable
        data-test-subj="rule-backfills-table"
        items={data?.data ?? []}
        columns={columns}
        pagination={pagination}
        error={isError ? 'error' : undefined}
        loading={isLoading}
        onChange={handleTableChange}
      />
    </EuiPanel>
  );
};
