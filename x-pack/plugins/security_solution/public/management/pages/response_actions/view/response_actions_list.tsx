/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import {
  CriteriaWithPagination,
  EuiAvatar,
  EuiBadge,
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
  EuiFlexGrid,
} from '@elastic/eui';
import { euiStyled, css } from '@kbn/kibana-react-plugin/common';

import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import type { HorizontalAlignment } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { ActionDetails } from '../../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../../common/endpoint/schema/actions';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { ManagementEmptyStateWrapper } from '../../../components/management_empty_state_wrapper';
import { useGetEndpointActionList } from '../../../hooks';
import { OUTPUT_MESSAGES, TABLE_COLUMN_NAMES, UX_MESSAGES } from '../translations';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { ActionListDateRangePicker } from './components/action_list_date_range_picker';
import type { DateRangePickerValues } from './components/action_list_date_range_picker';

const emptyValue = getEmptyValue();
const defaultDateRangeOptions = Object.freeze({
  autoRefreshOptions: {
    enabled: false,
    duration: 10000,
  },
  startDate: 'now-1d',
  endDate: 'now',
  recentlyUsedDateRanges: [],
});

const getCommand = (
  command: ActionDetails['command']
): Exclude<ActionDetails['command'], 'unisolate'> | 'release' =>
  command === 'unisolate' ? 'release' : command;

// Truncated usernames
const StyledFacetButton = euiStyled(EuiFacetButton)`
  .euiText {
    margin-top: 0.38rem;
    overflow-y: visible !important;
  }
`;

const customDescriptionListCss = css`
  dt,
  dd {
    color: ${(props) => props.theme.eui.euiColorDarkShade} !important;
    font-size: ${(props) => props.theme.eui.euiFontSizeXS} !important;
  }
  dt {
    font-weight: ${(props) => props.theme.eui.euiFontWeightSemiBold};
  }
`;

const StyledDescriptionList = euiStyled(EuiDescriptionList).attrs({ compressed: true })`
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

export const ResponseActionsList = memo<
  Pick<EndpointActionListRequestQuery, 'agentIds' | 'commands' | 'userIds'> & {
    hideHeader?: boolean;
    hideHostNameColumn?: boolean;
  }
>(({ agentIds, commands, userIds, hideHeader = false }) => {
  const getTestId = useTestIdGenerator('response-actions-list');
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
    [k: ActionDetails['id']]: React.ReactNode;
  }>({});

  const [queryParams, setQueryParams] = useState<EndpointActionListRequestQuery>({
    page: 1,
    pageSize: 10,
    agentIds,
    commands,
    userIds,
  });

  // date range picker settings
  const [dateRangePickerState, setDateRangePickerState] =
    useState<DateRangePickerValues>(defaultDateRangeOptions);

  // initial fetch of list data
  const {
    error,
    data: actionList,
    isFetching,
    isFetched,
    refetch: reFetchEndpointActionList,
  } = useGetEndpointActionList({
    ...queryParams,
    startDate: dateRangePickerState.startDate,
    endDate: dateRangePickerState.endDate,
  });

  const updateActionListDateRanges = useCallback(
    ({ start, end }) => {
      setDateRangePickerState((prevState) => ({
        ...prevState,
        startDate: dateMath.parse(start)?.toISOString(),
        endDate: dateMath.parse(end)?.toISOString(),
      }));
    },
    [setDateRangePickerState]
  );

  const updateActionListRecentlyUsedDateRanges = useCallback(
    (recentlyUsedDateRanges) => {
      setDateRangePickerState((prevState) => ({
        ...prevState,
        recentlyUsedDateRanges,
      }));
    },
    [setDateRangePickerState]
  );

  // update refresh timer
  const onRefreshChange = useCallback(
    (evt: OnRefreshChangeProps) => {
      setDateRangePickerState((prevState) => ({
        ...prevState,
        autoRefreshOptions: { enabled: !evt.isPaused, duration: evt.refreshInterval },
      }));
    },
    [setDateRangePickerState]
  );

  // auto refresh data
  const onRefresh = useCallback(() => {
    if (dateRangePickerState.autoRefreshOptions.enabled) {
      reFetchEndpointActionList();
    }
  }, [dateRangePickerState.autoRefreshOptions.enabled, reFetchEndpointActionList]);

  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd }: DurationRange) => {
      const newRecentlyUsedDateRanges = [
        { start: newStart, end: newEnd },
        ...dateRangePickerState.recentlyUsedDateRanges
          .filter(
            (recentlyUsedRange: DurationRange) =>
              !(recentlyUsedRange.start === newStart && recentlyUsedRange.end === newEnd)
          )
          .slice(0, 9),
      ];

      // update date ranges
      updateActionListDateRanges({ start: newStart, end: newEnd });
      // update recently used date ranges
      updateActionListRecentlyUsedDateRanges(newRecentlyUsedDateRanges);
    },
    [
      dateRangePickerState.recentlyUsedDateRanges,
      updateActionListDateRanges,
      updateActionListRecentlyUsedDateRanges,
    ]
  );

  // total actions
  const totalItemCount = useMemo(() => actionList?.total ?? 0, [actionList]);

  // expanded tray contents
  const toggleDetails = useCallback(
    (item: ActionDetails) => {
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
          ? Object.entries(parameters as Object).map(([key, value]) => {
              return `${key}:${value}`;
            })
          : undefined;

        const command = getCommand(_command);
        const descriptionListLeft = [
          {
            title: OUTPUT_MESSAGES.expandSection.placedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.input,
            description: `${command}`,
          },
        ];

        const descriptionListCenter = [
          {
            title: OUTPUT_MESSAGES.expandSection.startedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.parameters,
            description: parametersList ? parametersList : emptyValue,
          },
        ];

        const descriptionListRight = [
          {
            title: OUTPUT_MESSAGES.expandSection.completedAt,
            description: `${completedAt ?? emptyValue}`,
          },
        ];

        const outputList = [
          {
            title: OUTPUT_MESSAGES.expandSection.output,
            description: (
              // codeblock for output
              <StyledEuiCodeBlock>
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
              data-test-subj={getTestId('output-section')}
              direction="column"
              style={{ maxHeight: 270, overflowY: 'auto' }}
              className="eui-yScrollWithShadows"
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGrid columns={3}>
                  {[descriptionListLeft, descriptionListCenter, descriptionListRight].map(
                    (_list, i) => {
                      const list = _list.map((l) => {
                        const isParameters = l.title === OUTPUT_MESSAGES.expandSection.parameters;
                        return {
                          title: l.title,
                          description: isParameters ? (
                            // codeblock for parameters
                            <StyledEuiCodeBlock>{l.description}</StyledEuiCodeBlock>
                          ) : (
                            l.description
                          ),
                        };
                      });

                      return (
                        <EuiFlexItem key={i}>
                          <StyledDescriptionList listItems={list} />
                        </EuiFlexItem>
                      );
                    }
                  )}
                </EuiFlexGrid>
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
    (data: ActionDetails) => () => toggleDetails(data),
    [toggleDetails]
  );

  // table column
  const responseActionListColumns = useMemo(() => {
    const columns = [
      {
        field: 'startedAt',
        name: TABLE_COLUMN_NAMES.time,
        width: '15%',
        truncateText: true,
        render: (startedAt: ActionDetails['startedAt']) => {
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
        width: '10%',
        truncateText: true,
        render: (_command: ActionDetails['command']) => {
          const command = getCommand(_command);
          return (
            <EuiToolTip content={command} anchorClassName="eui-textTruncate">
              <FormattedMessage
                id="xpack.securitySolution.responseActionsList.list.item.command"
                defaultMessage="{command}"
                values={{ command }}
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'createdBy',
        name: TABLE_COLUMN_NAMES.user,
        width: '14%',
        truncateText: true,
        render: (userId: ActionDetails['createdBy']) => {
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
      // conditional hostname column
      {
        field: 'agents',
        name: TABLE_COLUMN_NAMES.host,
        width: '20%',
        truncateText: true,
        render: (agents: ActionDetails['agents']) => {
          // TODO: compute host names later with hostMetadata? (using agent Ids for now)
          const hostname = agents?.[0] ?? '';
          return (
            <EuiToolTip content={hostname} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-hostname')}
              >
                {hostname}
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'comment',
        name: TABLE_COLUMN_NAMES.comments,
        width: '30%',
        truncateText: true,
        render: (comment: ActionDetails['comment']) => {
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
        field: 'isCompleted',
        name: TABLE_COLUMN_NAMES.status,
        width: '10%',
        render: (isCompleted: ActionDetails['isCompleted'], data: ActionDetails) => {
          const status = data.isExpired
            ? UX_MESSAGES.badge.failed
            : isCompleted
            ? data.wasSuccessful
              ? UX_MESSAGES.badge.completed
              : UX_MESSAGES.badge.failed
            : UX_MESSAGES.badge.pending;

          return (
            <EuiToolTip content={status} anchorClassName="eui-textTruncate">
              <EuiBadge
                data-test-subj={getTestId('column-status')}
                color={
                  data.isExpired
                    ? 'danger'
                    : isCompleted
                    ? data.wasSuccessful
                      ? 'success'
                      : 'danger'
                    : 'warning'
                }
              >
                <FormattedMessage
                  id="xpack.securitySolution.responseActionsList.list.item.status"
                  defaultMessage="{status}"
                  values={{ status }}
                />
              </EuiBadge>
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
        render: (data: ActionDetails) => {
          return (
            <EuiButtonIcon
              data-test-subj={getTestId('expand-button')}
              onClick={onClickCallback(data)}
              aria-label={itemIdToExpandedRowMap[data.id] ? 'Collapse' : 'Expand'}
              iconType={itemIdToExpandedRowMap[data.id] ? 'arrowUp' : 'arrowDown'}
            />
          );
        },
      },
    ];
    // filter out the host column
    if (typeof agentIds === 'string') {
      return columns.filter((column) => column.field !== 'agents');
    }
    return columns;
  }, [agentIds, getTestId, itemIdToExpandedRowMap, onClickCallback]);

  // table pagination
  const tablePagination = useMemo(() => {
    return {
      // this controls the table UI page
      // to match 0-based table paging
      pageIndex: (queryParams.page || 1) - 1,
      pageSize: queryParams.pageSize || 10,
      totalItemCount,
      pageSizeOptions: MANAGEMENT_PAGE_SIZE_OPTIONS as number[],
    };
  }, [queryParams, totalItemCount]);

  // handle onChange
  const handleTableOnChange = useCallback(
    ({ page: _page }: CriteriaWithPagination<ActionDetails>) => {
      // table paging is 0 based
      const { index, size } = _page;
      setQueryParams((prevState) => ({
        ...prevState,
        // adjust the page to conform to
        // 1-based API page
        page: index + 1,
        pageSize: size,
      }));
      reFetchEndpointActionList();
    },
    [reFetchEndpointActionList, setQueryParams]
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
    <AdministrationListPage
      data-test-subj="responseActionsPage"
      title={hideHeader ? undefined : UX_MESSAGES.pageTitle}
    >
      <ActionListDateRangePicker
        dateRangePickerState={dateRangePickerState}
        isDataLoading={isFetching}
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
    </AdministrationListPage>
  );
});

ResponseActionsList.displayName = 'ResponseActionsList';
