/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import {
  type CriteriaWithPagination,
  EuiAvatar,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFacetButton,
  EuiHorizontalRule,
  EuiI18nNumber,
  EuiScreenReaderOnly,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
  type HorizontalAlignment,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';

import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../common/endpoint/service/response_actions/constants';
import { SecurityPageName } from '../../../../../common/constants';
import { getRuleDetailsUrl } from '../../../../common/components/link_to';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import type { ActionListApiResponse } from '../../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../../common/api/endpoint';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { ARIA_LABELS, TABLE_COLUMN_NAMES, UX_MESSAGES } from '../translations';
import { getActionStatus } from './hooks';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { ResponseActionStatusBadge } from './response_action_status_badge';
import { ActionsLogExpandedTray } from './action_log_expanded_tray';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { useUrlPagination } from '../../../hooks/use_url_pagination';

const emptyValue = getEmptyValue();

// Truncated usernames
const StyledFacetButton = euiStyled(EuiFacetButton).attrs({ title: undefined })`
  .euiText {
    margin-top: 0.38rem;
    overflow-y: visible !important;
  }
`;

interface ExpandedRowMapType {
  [k: string]: React.ReactNode;
}

const getResponseActionListTableColumns = ({
  getTestId,
  expandedRowMap,
  showHostNames,
  onClickCallback,
}: {
  getTestId: (suffix?: string | undefined) => string | undefined;
  expandedRowMap: ExpandedRowMapType;
  showHostNames: boolean;
  onClickCallback: (actionListDataItem: ActionListApiResponse['data'][number]) => () => void;
}) => {
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
        const command = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[_command];
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
      name: TABLE_COLUMN_NAMES.user,
      width: !showHostNames ? '21%' : '14%',
      truncateText: true,
      render: ({ createdBy, ruleId }: ActionListApiResponse['data'][number]) => {
        if (createdBy === 'unknown' && ruleId) {
          return (
            <EuiToolTip content={UX_MESSAGES.triggeredByRule} anchorClassName="eui-textTruncate">
              <SecuritySolutionLinkAnchor
                data-test-subj="ruleName"
                deepLinkId={SecurityPageName.rules}
                path={getRuleDetailsUrl(ruleId)}
              >
                <EuiText
                  size="s"
                  className="eui-textTruncate eui-fullWidth"
                  data-test-subj={getTestId('column-user-name')}
                >
                  {UX_MESSAGES.triggeredByRule}
                </EuiText>
              </SecuritySolutionLinkAnchor>
            </EuiToolTip>
          );
        }
        return (
          <StyledFacetButton
            icon={
              <EuiAvatar
                // We've a EuiTooltip that shows for createdBy below,
                // Thus we don't need to add a title tooltip as well.
                aria-hidden={true}
                title=""
                name={createdBy}
                data-test-subj={getTestId('column-user-avatar')}
                size="s"
              />
            }
          >
            <EuiToolTip content={createdBy} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-user-name')}
              >
                {createdBy}
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
            <ResponseActionStatusBadge
              color={
                _status === 'failed' ? 'danger' : _status === 'successful' ? 'success' : 'warning'
              }
              data-test-subj={getTestId('column-status')}
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
        const actionId = actionListDataItem.id;
        return (
          <EuiButtonIcon
            data-test-subj={getTestId('expand-button')}
            onClick={onClickCallback(actionListDataItem)}
            aria-label={expandedRowMap[actionId] ? ARIA_LABELS.collapse : ARIA_LABELS.expand}
            iconType={expandedRowMap[actionId] ? 'arrowUp' : 'arrowDown'}
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
};

interface ActionsLogTableProps {
  error?: string;
  'data-test-subj'?: string;
  items: ActionListApiResponse['data'];
  isFlyout: boolean;
  loading: boolean;
  onChange: ({
    // @ts-expect-error upgrade typescript v4.9.5
    page: _page,
  }: CriteriaWithPagination<ActionListApiResponse['data'][number]>) => void;
  onShowActionDetails: (actionIds: string[]) => void;
  queryParams: EndpointActionListRequestQuery;
  showHostNames: boolean;
  totalItemCount: number;
}

export const ActionsLogTable = memo<ActionsLogTableProps>(
  ({
    'data-test-subj': dataTestSubj,
    error,
    items,
    isFlyout,
    loading,
    onChange,
    onShowActionDetails,
    queryParams,
    showHostNames,
    totalItemCount,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { pagination: paginationFromUrlParams } = useUrlPagination();

    const [expandedRowMap, setExpandedRowMap] = useState<ExpandedRowMapType>({});

    const actionIdsWithOpenTrays = useMemo(
      (): string[] =>
        // get the list of action ids from the query params for flyout view
        queryParams.withOutputs
          ? typeof queryParams.withOutputs === 'string'
            ? [queryParams.withOutputs]
            : queryParams.withOutputs
          : [],
      [queryParams.withOutputs]
    );

    const redoOpenTrays = useCallback(() => {
      if (actionIdsWithOpenTrays.length && items.length) {
        const openDetails = actionIdsWithOpenTrays.reduce<ExpandedRowMapType>(
          (idToRowMap, actionId) => {
            const actionItem = items.find((item) => item.id === actionId);
            if (!actionItem) {
              idToRowMap[actionId] = <EuiSkeletonText size="relative" lines={8} />;
            } else {
              idToRowMap[actionId] = (
                <ActionsLogExpandedTray action={actionItem} data-test-subj={dataTestSubj} />
              );
            }
            return idToRowMap;
          },
          {}
        );
        setExpandedRowMap(openDetails);
      }
    }, [actionIdsWithOpenTrays, dataTestSubj, items]);

    // open trays that were open using URL params/ query params
    useEffect(() => {
      redoOpenTrays();
    }, [redoOpenTrays]);

    const toggleDetails = useCallback(
      (action: ActionListApiResponse['data'][number]) => {
        const expandedRowMapCopy = { ...expandedRowMap };
        if (expandedRowMapCopy[action.id]) {
          // close tray
          delete expandedRowMapCopy[action.id];
        } else {
          // assign the expanded tray content to the map
          // with action details
          expandedRowMapCopy[action.id] = (
            <ActionsLogExpandedTray action={action} data-test-subj={dataTestSubj} />
          );
        }
        onShowActionDetails(Object.keys(expandedRowMapCopy));
        setExpandedRowMap(expandedRowMapCopy);
      },
      [expandedRowMap, onShowActionDetails, dataTestSubj]
    );

    // memoized callback for toggleDetails
    const onClickCallback = useCallback(
      (actionListDataItem: ActionListApiResponse['data'][number]) => () =>
        toggleDetails(actionListDataItem),
      [toggleDetails]
    );

    // table pagination
    const tablePagination = useMemo(() => {
      return {
        pageIndex: isFlyout ? (queryParams.page || 1) - 1 : paginationFromUrlParams.page - 1,
        pageSize: isFlyout ? queryParams.pageSize || 10 : paginationFromUrlParams.pageSize,
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
        <EuiText color="default" size="xs" data-test-subj={getTestId('endpointListTableTotal')}>
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

    const columns = useMemo(
      () =>
        getResponseActionListTableColumns({
          getTestId,
          expandedRowMap,
          onClickCallback,
          showHostNames,
        }),
      [expandedRowMap, getTestId, onClickCallback, showHostNames]
    );

    return (
      <>
        {recordRangeLabel}
        <EuiHorizontalRule margin="xs" />
        <EuiBasicTable
          data-test-subj={dataTestSubj}
          items={items}
          columns={columns}
          itemId="id"
          itemIdToExpandedRowMap={expandedRowMap}
          pagination={tablePagination}
          onChange={onChange}
          loading={loading}
          error={error}
        />
      </>
    );
  }
);

ActionsLogTable.displayName = 'ActionsLogTable';
