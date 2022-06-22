/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import type { HorizontalAlignment } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { FormattedDate } from '../../../../common/components/formatted_date';
import {
  ActionDetails,
  LogsEndpointActionResponse,
  EndpointActivityLogAction,
} from '../../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../../common/endpoint/schema/actions';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { ManagementEmptyStateWrapper } from '../../../components/management_empty_state_wrapper';
import { useGetEndpointActionList } from '../../../hooks';
import { OUTPUT_MESSAGES, TABLE_COLUMN_NAMES, UX_MESSAGES } from '../translations';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

// Truncated usernames
const StyledFacetButton = styled(EuiFacetButton)`
  .euiText {
    margin-top: 0.38rem;
    overflow-y: visible !important;
  }
`;

export const ResponseActionsList = memo<
  EndpointActionListRequestQuery & { hideHeader?: boolean; hideHostNameColumn?: boolean }
>(({ agentIds, commands, userIds, hideHeader = false, hideHostNameColumn = false }) => {
  const getTestId = useTestIdGenerator('response-actions-list');
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
    [k: ActionDetails['id']]: React.ReactNode;
  }>({});

  const [queryParams, setQueryParams] = useState<EndpointActionListRequestQuery>({
    page: 0,
    pageSize: 10,
    agentIds,
    commands,
    userIds,
  });

  // initial fetch of list data
  const {
    error,
    data: actionList,
    isFetching,
    isFetched,
    refetch: reFetchEndpointActionList,
  } = useGetEndpointActionList(queryParams, {
    keepPreviousData: true,
  });

  // total actions
  const totalItemCount = useMemo(() => actionList?.total, [actionList]);

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
          command,
          logEntries,
        } = item;

        // TODO: Remove this once we have
        // ActionDetails.output, ActionDetails.parameters and ActionDetails.comments
        const responseData = logEntries.reduce<
          Array<LogsEndpointActionResponse['EndpointActions']['data']>
        >((acc, curr) => {
          if (curr.type === 'response') {
            acc.push(curr.item.data.EndpointActions.data);
          }
          return acc;
        }, []);

        const descriptionListLeft = [
          {
            title: OUTPUT_MESSAGES.expandSection.placedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.input,
            description: `${command}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.output,
            description: isExpired
              ? OUTPUT_MESSAGES.hasExpired(command)
              : isCompleted
              ? wasSuccessful
                ? OUTPUT_MESSAGES.wasSuccessful(command)
                : OUTPUT_MESSAGES.hasFailed(command)
              : OUTPUT_MESSAGES.isPending(command),
          },
        ];

        const descriptionListCenter = [
          {
            title: OUTPUT_MESSAGES.expandSection.startedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.parameters,
            description: responseData.length ? responseData[0].parameters ?? '-' : '-',
          },
        ];

        const descriptionListRight = [
          {
            title: OUTPUT_MESSAGES.expandSection.completedAt,
            description: `${completedAt ?? '-'}`,
          },
        ];

        itemIdToExpandedRowMapValues[item.id] = (
          <EuiFlexGroup>
            {[descriptionListLeft, descriptionListCenter, descriptionListRight].map((list) => (
              <EuiFlexItem>
                <EuiDescriptionList listItems={list} compressed={true} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [itemIdToExpandedRowMap]
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
        render: (command: ActionDetails['command']) => {
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
        field: 'logEntries',
        name: TABLE_COLUMN_NAMES.user,
        width: '14%',
        truncateText: true,
        render: (logEntries: ActionDetails['logEntries']) => {
          const userId =
            (logEntries.filter((e) => e.type === 'action')[0] as EndpointActivityLogAction).item
              .data.user.id || '-';
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
                  <p className="eui-displayInline eui-TextTruncate">{userId}</p>
                </EuiText>
              </EuiToolTip>
            </StyledFacetButton>
          );
        },
      },
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
                <p className="eui-displayInline eui-TextTruncate">{hostname}</p>
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      // conditional hostname column
      {
        field: 'logEntries',
        name: TABLE_COLUMN_NAMES.comments,
        width: '30%',
        truncateText: true,
        render: (logEntries: ActionDetails['logEntries']) => {
          const comment =
            (logEntries.filter((e) => e.type === 'action')[0] as EndpointActivityLogAction).item
              .data.EndpointActions.data.comment || '-';
          return (
            <EuiToolTip content={comment} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-comments')}
              >
                <p className="eui-displayInline eui-TextTruncate">{comment}</p>
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
              onClick={() => toggleDetails(data)}
              aria-label={itemIdToExpandedRowMap[data.id] ? 'Collapse' : 'Expand'}
              iconType={itemIdToExpandedRowMap[data.id] ? 'arrowUp' : 'arrowDown'}
            />
          );
        },
      },
    ];
    if (hideHostNameColumn) {
      columns.splice(3, 1);
    }
    return columns;
  }, [getTestId, hideHostNameColumn, itemIdToExpandedRowMap, toggleDetails]);

  // table pagination
  const tablePagination = useMemo(() => {
    return {
      pageIndex: queryParams.page || 0,
      pageSize: queryParams.pageSize || 10,
      totalItemCount: totalItemCount || 0,
      pageSizeOptions: MANAGEMENT_PAGE_SIZE_OPTIONS as number[],
    };
  }, [queryParams, totalItemCount]);

  // handle onChange
  const handleTableOnChange = useCallback(
    ({ page: _page }: CriteriaWithPagination<ActionDetails>) => {
      const { index, size } = _page;
      setQueryParams((prevState) => ({
        ...prevState,
        page: index,
        pageSize: size,
      }));
      reFetchEndpointActionList();
    },
    [reFetchEndpointActionList, setQueryParams]
  );

  return (
    <AdministrationListPage
      data-test-subj="responseActionsPage"
      title={hideHeader ? undefined : UX_MESSAGES.pageTitle}
    >
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
          <EuiText color="subdued" size="xs" data-test-subj={getTestId('endpointListTableTotal')}>
            <FormattedMessage
              id="xpack.securitySolution.responseActionsList.list.totalCount"
              defaultMessage="Showing {totalItemCount, plural, one {# response action} other {# response actions}}"
              values={{ totalItemCount }}
            />
          </EuiText>
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
