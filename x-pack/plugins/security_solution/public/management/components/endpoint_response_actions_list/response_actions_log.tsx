/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiBasicTable,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFacetButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiScreenReaderOnly,
  EuiI18nNumber,
  EuiText,
  EuiCodeBlock,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { euiStyled, css } from '@kbn/kibana-react-plugin/common';

import type { HorizontalAlignment, CriteriaWithPagination } from '@elastic/eui';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  ResponseActions,
  ResponseActionStatus,
} from '../../../../common/endpoint/service/response_actions/constants';
import { getEmptyValue } from '../../../common/components/empty_value';
import { FormattedDate } from '../../../common/components/formatted_date';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { ManagementEmptyStateWrapper } from '../management_empty_state_wrapper';
import { useGetEndpointActionList } from '../../hooks';
import { OUTPUT_MESSAGES, TABLE_COLUMN_NAMES, UX_MESSAGES } from './translations';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../common/constants';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { ActionsLogFilters } from './components/actions_log_filters';
import {
  getActionStatus,
  getUiCommand,
  getCommandKey,
  useDateRangePicker,
} from './components/hooks';
import { StatusBadge } from './components/status_badge';
import { useActionHistoryUrlParams } from './components/use_action_history_url_params';
import { useUrlPagination } from '../../hooks/use_url_pagination';

const emptyValue = getEmptyValue();

// Truncated usernames
const StyledFacetButton = euiStyled(EuiFacetButton)`
  .euiText {
    margin-top: 0.38rem;
    overflow-y: visible !important;
  }
`;

const customDescriptionListCss = css`
  &.euiDescriptionList {
    > .euiDescriptionList__title {
      color: ${(props) => props.theme.eui.euiColorDarkShade};
      font-size: ${(props) => props.theme.eui.euiFontSizeXS};
      margin-top: ${(props) => props.theme.eui.euiSizeS};
    }

    > .euiDescriptionList__description {
      font-weight: ${(props) => props.theme.eui.euiFontWeightSemiBold};
      margin-top: ${(props) => props.theme.eui.euiSizeS};
    }
  }
`;

const StyledDescriptionList = euiStyled(EuiDescriptionList).attrs({
  compressed: true,
  type: 'column',
})`
  ${customDescriptionListCss}
`;

// output section styles
const topSpacingCss = css`
  ${(props) => `${props.theme.eui.euiCodeBlockPaddingModifiers.paddingMedium} 0`}
`;
const dashedBorderCss = css`
  ${(props) => `1px dashed ${props.theme.eui.euiColorDisabled}`};
`;
const StyledDescriptionListOutput = euiStyled(EuiDescriptionList).attrs({ compressed: true })`
  ${customDescriptionListCss}
  dd {
    margin: ${topSpacingCss};
    padding: ${topSpacingCss};
    border-top: ${dashedBorderCss};
    border-bottom: ${dashedBorderCss};
  }
`;

// code block styles
const StyledEuiCodeBlock = euiStyled(EuiCodeBlock).attrs({
  transparentBackground: true,
  paddingSize: 'none',
})`
  code {
    color: ${(props) => props.theme.eui.euiColorDarkShade} !important;
  }
`;

export const ResponseActionsLog = memo<
  Pick<EndpointActionListRequestQuery, 'agentIds'> & { showHostNames?: boolean; isFlyout?: boolean }
>(({ agentIds, showHostNames = false, isFlyout = true }) => {
  const { pagination: paginationFromUrlParams, setPagination: setPaginationOnUrlParams } =
    useUrlPagination();
  const {
    commands: commandsFromUrl,
    statuses: statusesFromUrl,
    startDate: startDateFromUrl,
    endDate: endDateFromUrl,
  } = useActionHistoryUrlParams();

  const getTestId = useTestIdGenerator('response-actions-list');
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
    [k: ActionListApiResponse['data'][number]['id']]: React.ReactNode;
  }>({});

  const [queryParams, setQueryParams] = useState<EndpointActionListRequestQuery>({
    page: isFlyout ? 1 : paginationFromUrlParams.page,
    pageSize: isFlyout ? 10 : paginationFromUrlParams.pageSize,
    agentIds,
    commands: [],
    statuses: [],
    userIds: [],
  });

  // update query state from URL params
  useEffect(() => {
    if (!isFlyout) {
      setQueryParams((prevState) => ({
        ...prevState,
        commands: commandsFromUrl?.length
          ? commandsFromUrl.map((commandFromUrl) => getCommandKey(commandFromUrl))
          : prevState.commands,
        statuses: statusesFromUrl?.length
          ? (statusesFromUrl as ResponseActionStatus[])
          : prevState.statuses,
      }));
    }
  }, [commandsFromUrl, isFlyout, statusesFromUrl, setQueryParams]);

  // date range picker state and handlers
  const { dateRangePickerState, onRefreshChange, onTimeChange } = useDateRangePicker(isFlyout);

  // initial fetch of list data
  const {
    error,
    data: actionList,
    isFetching,
    isFetched,
    refetch: reFetchEndpointActionList,
  } = useGetEndpointActionList({
    ...queryParams,
    startDate: isFlyout ? dateRangePickerState.startDate : startDateFromUrl,
    endDate: isFlyout ? dateRangePickerState.endDate : endDateFromUrl,
  });

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
        commands: selectedCommands as ResponseActions[],
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

  // total actions
  const totalItemCount = useMemo(() => actionList?.total ?? 0, [actionList]);

  // expanded tray contents
  const toggleDetails = useCallback(
    (item: ActionListApiResponse['data'][number]) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[item.id]) {
        delete itemIdToExpandedRowMapValues[item.id];
      } else {
        const {
          startedAt,
          completedAt,
          isCompleted,
          wasSuccessful,
          isExpired,
          command: _command,
          parameters,
        } = item;

        const parametersList = parameters
          ? Object.entries(parameters).map(([key, value]) => {
              return `${key}:${value}`;
            })
          : undefined;

        const command = getUiCommand(_command);
        const dataList = [
          {
            title: OUTPUT_MESSAGES.expandSection.placedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.startedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.completedAt,
            description: `${completedAt ?? emptyValue}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.input,
            description: `${command}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.parameters,
            description: parametersList ? parametersList : emptyValue,
          },
        ].map(({ title, description }) => {
          return {
            title: <StyledEuiCodeBlock>{title}</StyledEuiCodeBlock>,
            description: <StyledEuiCodeBlock>{description}</StyledEuiCodeBlock>,
          };
        });

        const outputList = [
          {
            title: (
              <StyledEuiCodeBlock>{`${OUTPUT_MESSAGES.expandSection.output}:`}</StyledEuiCodeBlock>
            ),
            description: (
              // codeblock for output
              <StyledEuiCodeBlock data-test-subj={getTestId('details-tray-output')}>
                {isExpired
                  ? OUTPUT_MESSAGES.hasExpired(command)
                  : isCompleted
                  ? wasSuccessful
                    ? OUTPUT_MESSAGES.wasSuccessful(command)
                    : OUTPUT_MESSAGES.hasFailed(command)
                  : OUTPUT_MESSAGES.isPending(command)}
              </StyledEuiCodeBlock>
            ),
          },
        ];

        itemIdToExpandedRowMapValues[item.id] = (
          <>
            <EuiFlexGroup
              data-test-subj={getTestId('details-tray')}
              direction="column"
              style={{ maxHeight: 270, overflowY: 'auto' }}
              className="eui-yScrollWithShadows"
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <StyledDescriptionList listItems={dataList} />
              </EuiFlexItem>
              <EuiFlexItem>
                <StyledDescriptionListOutput listItems={outputList} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [getTestId, itemIdToExpandedRowMap]
  );
  // memoized callback for toggleDetails
  const onClickCallback = useCallback(
    (actionListDataItem: ActionListApiResponse['data'][number]) => () =>
      toggleDetails(actionListDataItem),
    [toggleDetails]
  );

  // table column
  const responseActionListColumns = useMemo(() => {
    const columns = [
      {
        field: 'startedAt',
        name: TABLE_COLUMN_NAMES.time,
        width: !showHostNames ? '21%' : '15%',
        truncateText: true,
        render: (startedAt: ActionListApiResponse['data'][number]['startedAt']) => {
          return (
            <FormattedDate
              fieldName={TABLE_COLUMN_NAMES.time}
              value={startedAt}
              className="eui-textTruncate"
            />
          );
        },
      },
      {
        field: 'command',
        name: TABLE_COLUMN_NAMES.command,
        width: !showHostNames ? '21%' : '10%',
        truncateText: true,
        render: (_command: ActionListApiResponse['data'][number]['command']) => {
          const command = getUiCommand(_command);
          return (
            <EuiToolTip content={command} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-command')}
              >
                {command}
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'createdBy',
        name: TABLE_COLUMN_NAMES.user,
        width: !showHostNames ? '21%' : '14%',
        truncateText: true,
        render: (userId: ActionListApiResponse['data'][number]['createdBy']) => {
          return (
            <StyledFacetButton
              icon={
                <EuiAvatar
                  name={userId}
                  data-test-subj={getTestId('column-user-avatar')}
                  size="s"
                />
              }
            >
              <EuiToolTip content={userId} anchorClassName="eui-textTruncate">
                <EuiText
                  size="s"
                  className="eui-textTruncate eui-fullWidth"
                  data-test-subj={getTestId('column-user-name')}
                >
                  {userId}
                </EuiText>
              </EuiToolTip>
            </StyledFacetButton>
          );
        },
      },
      // conditional hostnames column
      {
        field: 'hosts',
        name: TABLE_COLUMN_NAMES.hosts,
        width: '20%',
        truncateText: true,
        render: (_hosts: ActionListApiResponse['data'][number]['hosts']) => {
          const hosts = _hosts && Object.values(_hosts);
          // join hostnames if the action is for multiple agents
          // and skip empty strings for names if any
          const _hostnames = hosts
            .reduce<string[]>((acc, host) => {
              if (host.name.trim()) {
                acc.push(host.name);
              }
              return acc;
            }, [])
            .join(', ');

          let hostnames = _hostnames;
          if (!_hostnames) {
            if (hosts.length > 1) {
              // when action was for a single agent and no host name
              hostnames = UX_MESSAGES.unenrolled.hosts;
            } else if (hosts.length === 1) {
              // when action was for a multiple agents
              // and none of them have a host name
              hostnames = UX_MESSAGES.unenrolled.host;
            }
          }
          return (
            <EuiToolTip content={hostnames} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-hostname')}
              >
                {hostnames}
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'comment',
        name: TABLE_COLUMN_NAMES.comments,
        width: !showHostNames ? '21%' : '30%',
        truncateText: true,
        render: (comment: ActionListApiResponse['data'][number]['comment']) => {
          return (
            <EuiToolTip content={comment} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-comments')}
              >
                {comment ?? emptyValue}
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'status',
        name: TABLE_COLUMN_NAMES.status,
        width: !showHostNames ? '15%' : '10%',
        render: (_status: ActionListApiResponse['data'][number]['status']) => {
          const status = getActionStatus(_status);

          return (
            <EuiToolTip content={status} anchorClassName="eui-textTruncate">
              <StatusBadge
                color={
                  _status === 'failed' ? 'danger' : _status === 'successful' ? 'success' : 'warning'
                }
                status={status}
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: '',
        align: RIGHT_ALIGNMENT as HorizontalAlignment,
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>{UX_MESSAGES.screenReaderExpand}</span>
          </EuiScreenReaderOnly>
        ),
        render: (actionListDataItem: ActionListApiResponse['data'][number]) => {
          return (
            <EuiButtonIcon
              data-test-subj={getTestId('expand-button')}
              onClick={onClickCallback(actionListDataItem)}
              aria-label={itemIdToExpandedRowMap[actionListDataItem.id] ? 'Collapse' : 'Expand'}
              iconType={itemIdToExpandedRowMap[actionListDataItem.id] ? 'arrowUp' : 'arrowDown'}
            />
          );
        },
      },
    ];
    // filter out the `hosts` column
    // if showHostNames is FALSE
    if (!showHostNames) {
      return columns.filter((column) => column.field !== 'hosts');
    }
    return columns;
  }, [showHostNames, getTestId, itemIdToExpandedRowMap, onClickCallback]);

  // table pagination
  const tablePagination = useMemo(() => {
    const pageIndex = isFlyout ? (queryParams.page || 1) - 1 : paginationFromUrlParams.page - 1;
    const pageSize = isFlyout ? queryParams.pageSize || 10 : paginationFromUrlParams.pageSize;
    return {
      // this controls the table UI page
      // to match 0-based table paging
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: MANAGEMENT_PAGE_SIZE_OPTIONS as number[],
    };
  }, [
    isFlyout,
    paginationFromUrlParams.page,
    paginationFromUrlParams.pageSize,
    queryParams.page,
    queryParams.pageSize,
    totalItemCount,
  ]);

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
      if (isFlyout) {
        setQueryParams((prevState) => ({
          ...prevState,
          ...pagingArgs,
        }));
      } else {
        setQueryParams((prevState) => ({
          ...prevState,
          ...pagingArgs,
        }));
        setPaginationOnUrlParams({
          ...pagingArgs,
        });
      }
      reFetchEndpointActionList();
    },
    [isFlyout, reFetchEndpointActionList, setQueryParams, setPaginationOnUrlParams]
  );

  // compute record ranges
  const pagedResultsCount = useMemo(() => {
    const page = queryParams.page ?? 1;
    const perPage = queryParams?.pageSize ?? 10;

    const totalPages = Math.ceil(totalItemCount / perPage);
    const fromCount = perPage * page - perPage + 1;
    const toCount =
      page === totalPages || totalPages === 1 ? totalItemCount : fromCount + perPage - 1;
    return { fromCount, toCount };
  }, [queryParams.page, queryParams.pageSize, totalItemCount]);

  // create range label to display
  const recordRangeLabel = useMemo(
    () => (
      <EuiText color="subdued" size="xs" data-test-subj={getTestId('endpointListTableTotal')}>
        <FormattedMessage
          id="xpack.securitySolution.responseActionsList.list.recordRange"
          defaultMessage="Showing {range} of {total} {recordsLabel}"
          values={{
            range: (
              <strong>
                <EuiI18nNumber value={pagedResultsCount.fromCount} />
                {'-'}
                <EuiI18nNumber value={pagedResultsCount.toCount} />
              </strong>
            ),
            total: <EuiI18nNumber value={totalItemCount} />,
            recordsLabel: <strong>{UX_MESSAGES.recordsLabel(totalItemCount)}</strong>,
          }}
        />
      </EuiText>
    ),
    [getTestId, pagedResultsCount.fromCount, pagedResultsCount.toCount, totalItemCount]
  );

  return (
    <>
      <ActionsLogFilters
        isFlyout={isFlyout}
        dateRangePickerState={dateRangePickerState}
        isDataLoading={isFetching}
        onClick={reFetchEndpointActionList}
        onChangeCommandsFilter={onChangeCommandsFilter}
        onChangeStatusesFilter={onChangeStatusesFilter}
        onRefresh={onRefresh}
        onRefreshChange={onRefreshChange}
        onTimeChange={onTimeChange}
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
                    defaultMessage="No response actions log"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.responseActionsList.empty.body"
                    defaultMessage="Try a different set of filters"
                  />
                </p>
              }
              data-test-subj="responseActions-empty"
            />
          </EuiFlexItem>
        </ManagementEmptyStateWrapper>
      ) : (
        <>
          {recordRangeLabel}
          <EuiHorizontalRule margin="xs" />
          <EuiBasicTable
            data-test-subj={getTestId('table-view')}
            items={actionList?.data || []}
            columns={responseActionListColumns}
            itemId="id"
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            isExpandable={true}
            pagination={tablePagination}
            onChange={handleTableOnChange}
            loading={isFetching}
            error={error !== null ? UX_MESSAGES.fetchError : undefined}
          />
        </>
      )}
    </>
  );
});

ResponseActionsLog.displayName = 'ResponseActionsLog';
