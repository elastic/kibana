/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
} from '@elastic/eui';
import { euiStyled, css } from '@kbn/kibana-react-plugin/common';

import type { HorizontalAlignment, CriteriaWithPagination } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getEmptyValue } from '../../../common/components/empty_value';
import { FormattedDate } from '../../../common/components/formatted_date';
import type { ActionDetails } from '../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { ManagementEmptyStateWrapper } from '../management_empty_state_wrapper';
import { useGetEndpointActionList } from '../../hooks';
import { OUTPUT_MESSAGES, TABLE_COLUMN_NAMES, UX_MESSAGES } from './translations';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../common/constants';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { ActionsLogFilters } from './components/actions_log_filters';
import { useDateRangePicker } from './components/hooks';

const emptyValue = getEmptyValue();

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

export const ResponseActionsLog = memo<Pick<EndpointActionListRequestQuery, 'agentIds'>>(
  ({ agentIds }) => {
    const getTestId = useTestIdGenerator('response-actions-list');
    const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
      [k: ActionDetails['id']]: React.ReactNode;
    }>({});

    const [queryParams, setQueryParams] = useState<EndpointActionListRequestQuery>({
      page: 1,
      pageSize: 10,
      agentIds,
      commands: [],
      userIds: [],
    });

    // date range picker state and handlers
    const { dateRangePickerState, onRefreshChange, onTimeChange } = useDateRangePicker();

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

    // handle auto refresh data
    const onRefresh = useCallback(() => {
      if (dateRangePickerState.autoRefreshOptions.enabled) {
        reFetchEndpointActionList();
      }
    }, [dateRangePickerState.autoRefreshOptions.enabled, reFetchEndpointActionList]);

    // handle on change actions filter
    const onChangeCommandsFilter = useCallback(
      (selectedCommands: string[]) => {
        setQueryParams((prevState) => ({ ...prevState, commands: selectedCommands }));
      },
      [setQueryParams]
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
            ? Object.entries(parameters).map(([key, value]) => {
                return `${key}:${value}`;
              })
            : undefined;

          const command = getCommand(_command);
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
      (data: ActionDetails) => () => toggleDetails(data),
      [toggleDetails]
    );

    // table column
    const responseActionListColumns = useMemo(() => {
      const hideHostColumn = typeof agentIds === 'string';

      const columns = [
        {
          field: 'startedAt',
          name: TABLE_COLUMN_NAMES.time,
          width: hideHostColumn ? '21%' : '15%',
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
          width: hideHostColumn ? '21%' : '10%',
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
          width: hideHostColumn ? '21%' : '14%',
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
          width: hideHostColumn ? '21%' : '30%',
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
          width: hideHostColumn ? '15%' : '10%',
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
      if (hideHostColumn) {
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
      <>
        <ActionsLogFilters
          dateRangePickerState={dateRangePickerState}
          isDataLoading={isFetching}
          onClick={reFetchEndpointActionList}
          onChangeCommandsFilter={onChangeCommandsFilter}
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
  }
);

ResponseActionsLog.displayName = 'ResponseActionsLog';
