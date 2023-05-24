/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexItem } from '@elastic/eui';

import type { CriteriaWithPagination } from '@elastic/eui';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  ResponseActionsApiCommandNames,
  ResponseActionStatus,
} from '../../../../common/endpoint/service/response_actions/constants';

import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { ManagementEmptyStateWrapper } from '../management_empty_state_wrapper';
import { useGetEndpointActionList } from '../../hooks';
import { UX_MESSAGES } from './translations';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { ActionsLogFilters } from './components/actions_log_filters';
import { getCommandKey, useDateRangePicker } from './components/hooks';
import { useActionHistoryUrlParams } from './components/use_action_history_url_params';
import { useUrlPagination } from '../../hooks/use_url_pagination';
import { ManagementPageLoader } from '../management_page_loader';
import { ActionsLogEmptyState } from './components/actions_log_empty_state';
import { ActionsLogTable } from './components/actions_log_table';

export const ResponseActionsLog = memo<
  Pick<EndpointActionListRequestQuery, 'agentIds'> & {
    showHostNames?: boolean;
    isFlyout?: boolean;
    setIsDataInResponse?: (isData: boolean) => void;
    'data-test-subj'?: string;
  }
>(
  ({
    agentIds,
    showHostNames = false,
    isFlyout = true,
    setIsDataInResponse,
    'data-test-subj': dataTestSubj = 'response-actions-list',
  }) => {
    const { pagination: paginationFromUrlParams, setPagination: setPaginationOnUrlParams } =
      useUrlPagination();
    const {
      commands: commandsFromUrl,
      hosts: agentIdsFromUrl,
      statuses: statusesFromUrl,
      startDate: startDateFromUrl,
      endDate: endDateFromUrl,
      users: usersFromUrl,
      withAutomatedActions: withAutomatedActionsFromUrl,
      withOutputs: withOutputsFromUrl,
      setUrlWithOutputs,
    } = useActionHistoryUrlParams();

    const getTestId = useTestIdGenerator(dataTestSubj);

    // Used to decide if display global loader or not (only the fist time tha page loads)
    const [isFirstAttempt, setIsFirstAttempt] = useState(true);

    const [queryParams, setQueryParams] = useState<EndpointActionListRequestQuery>({
      page: isFlyout ? 1 : paginationFromUrlParams.page,
      pageSize: isFlyout ? 10 : paginationFromUrlParams.pageSize,
      agentIds: isFlyout ? agentIds : agentIdsFromUrl?.length ? agentIdsFromUrl : agentIds,
      commands: [],
      statuses: [],
      userIds: [],
      withOutputs: [],
      withAutomatedActions: true,
    });

    // update query state from URL params
    useEffect(() => {
      if (!isFlyout) {
        setQueryParams((prevState) => ({
          ...prevState,
          commands: commandsFromUrl?.length
            ? commandsFromUrl.map((commandFromUrl) => getCommandKey(commandFromUrl))
            : prevState.commands,
          hosts: agentIdsFromUrl?.length ? agentIdsFromUrl : prevState.agentIds,
          statuses: statusesFromUrl?.length
            ? (statusesFromUrl as ResponseActionStatus[])
            : prevState.statuses,
          userIds: usersFromUrl?.length ? usersFromUrl : prevState.userIds,
          withOutputs: withOutputsFromUrl?.length ? withOutputsFromUrl : prevState.withOutputs,
          withAutomatedActions: !!withAutomatedActionsFromUrl,
        }));
      }
    }, [
      commandsFromUrl,
      agentIdsFromUrl,
      isFlyout,
      statusesFromUrl,
      setQueryParams,
      usersFromUrl,
      withOutputsFromUrl,
      withAutomatedActionsFromUrl,
    ]);

    // date range picker state and handlers
    const { dateRangePickerState, onRefreshChange, onTimeChange } = useDateRangePicker(isFlyout);

    // initial fetch of list data
    const {
      error,
      data: actionList,
      isFetching,
      isFetched,
      refetch: reFetchEndpointActionList,
    } = useGetEndpointActionList(
      {
        ...queryParams,
        startDate: isFlyout ? dateRangePickerState.startDate : startDateFromUrl,
        endDate: isFlyout ? dateRangePickerState.endDate : endDateFromUrl,
      },
      { retry: false }
    );

    // total actions
    const totalItemCount = useMemo(() => actionList?.total ?? 0, [actionList]);
    // table items
    const tableItems = useMemo(() => actionList?.data ?? [], [actionList?.data]);

    // Hide page header when there is no actions index calling the setIsDataInResponse with false value.
    // Otherwise, it shows the page header calling the setIsDataInResponse with true value and it also keeps track
    // if the API request was done for the first time.
    useEffect(() => {
      if (
        !isFetching &&
        error?.body?.statusCode === 404 &&
        error?.body?.message === 'index_not_found_exception'
      ) {
        if (setIsDataInResponse) {
          setIsDataInResponse(false);
        }
      } else if (!isFetching && actionList) {
        setIsFirstAttempt(false);
        if (setIsDataInResponse) {
          setIsDataInResponse(true);
        }
      }
    }, [actionList, error, isFetching, setIsDataInResponse]);

    // handle auto refresh data
    const onRefresh = useCallback(() => {
      if (dateRangePickerState.autoRefreshOptions.enabled) {
        reFetchEndpointActionList();
      }
    }, [dateRangePickerState.autoRefreshOptions.enabled, reFetchEndpointActionList]);

    // handle on change actions filter
    const onChangeCommandsFilter = useCallback(
      (selectedCommands: string[]) => {
        setQueryParams((prevState) => ({
          ...prevState,
          commands: selectedCommands as ResponseActionsApiCommandNames[],
        }));
      },
      [setQueryParams]
    );

    // handle on change actions filter
    const onChangeStatusesFilter = useCallback(
      (selectedStatuses: string[]) => {
        setQueryParams((prevState) => ({
          ...prevState,
          statuses: selectedStatuses as ResponseActionStatus[],
        }));
      },
      [setQueryParams]
    );

    // handle on change hosts filter
    const onChangeHostsFilter = useCallback(
      (selectedAgentIds: string[]) => {
        setQueryParams((prevState) => ({ ...prevState, agentIds: selectedAgentIds }));
      },
      [setQueryParams]
    );

    // handle on change users filter
    const onChangeUsersFilter = useCallback(
      (selectedUserIds: string[]) => {
        setQueryParams((prevState) => ({ ...prevState, userIds: selectedUserIds }));
      },
      [setQueryParams]
    );

    // handle onChange
    const handleTableOnChange = useCallback(
      ({ page: _page }: CriteriaWithPagination<ActionListApiResponse['data'][number]>) => {
        // table paging is 0 based
        const { index, size } = _page;
        // adjust the page to conform to
        // 1-based API page
        const pagingArgs = {
          page: index + 1,
          pageSize: size,
        };

        setQueryParams((prevState) => ({
          ...prevState,
          ...pagingArgs,
        }));
        if (!isFlyout) {
          setPaginationOnUrlParams({
            ...pagingArgs,
          });
        }
        reFetchEndpointActionList();
      },
      [isFlyout, reFetchEndpointActionList, setQueryParams, setPaginationOnUrlParams]
    );

    // handle on details open
    const onShowActionDetails = useCallback(
      (actionIds: string[]) => {
        setQueryParams((prevState) => ({ ...prevState, withOutputs: actionIds }));
        if (!isFlyout) {
          // set and show `withOutputs` URL param on history page
          setUrlWithOutputs(actionIds.join());
        }
      },
      [isFlyout, setUrlWithOutputs, setQueryParams]
    );

    if (error?.body?.statusCode === 404 && error?.body?.message === 'index_not_found_exception') {
      return <ActionsLogEmptyState data-test-subj={getTestId('empty-state')} />;
    } else if (isFetching && isFirstAttempt) {
      return <ManagementPageLoader data-test-subj={getTestId('global-loader')} />;
    }
    return (
      <>
        <ActionsLogFilters
          isFlyout={isFlyout}
          dateRangePickerState={dateRangePickerState}
          isDataLoading={isFetching}
          onClick={reFetchEndpointActionList}
          onChangeHostsFilter={onChangeHostsFilter}
          onChangeCommandsFilter={onChangeCommandsFilter}
          onChangeStatusesFilter={onChangeStatusesFilter}
          onChangeUsersFilter={onChangeUsersFilter}
          onRefresh={onRefresh}
          onRefreshChange={onRefreshChange}
          onTimeChange={onTimeChange}
          showHostsFilter={showHostNames}
          data-test-subj={dataTestSubj}
        />
        {isFetched && !totalItemCount ? (
          <ManagementEmptyStateWrapper>
            <EuiFlexItem data-test-subj={getTestId('empty-prompt')}>
              <EuiEmptyPrompt
                iconType="editorUnorderedList"
                titleSize="s"
                title={
                  <h2>
                    <FormattedMessage
                      id="xpack.securitySolution.responseActionsList.empty.title"
                      defaultMessage="No results match your search criteria"
                    />
                  </h2>
                }
                body={
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.responseActionsList.empty.body"
                      defaultMessage="Try modifying your search or filter set"
                    />
                  </p>
                }
                data-test-subj="responseActions-empty"
              />
            </EuiFlexItem>
          </ManagementEmptyStateWrapper>
        ) : (
          <ActionsLogTable
            data-test-subj={dataTestSubj}
            error={error !== null ? UX_MESSAGES.fetchError : undefined}
            items={tableItems}
            isFlyout={isFlyout}
            loading={isFetching}
            onChange={handleTableOnChange}
            onShowActionDetails={onShowActionDetails}
            queryParams={queryParams}
            showHostNames={showHostNames}
            totalItemCount={totalItemCount}
          />
        )}
      </>
    );
  }
);

ResponseActionsLog.displayName = 'ResponseActionsLog';
