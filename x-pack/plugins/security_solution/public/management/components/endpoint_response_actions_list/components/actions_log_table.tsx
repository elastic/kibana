/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo, useState } from 'react';

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiI18nNumber,
  EuiAvatar,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFacetButton,
  EuiHorizontalRule,
  RIGHT_ALIGNMENT,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  type HorizontalAlignment,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionListApiResponse } from '../../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../../common/endpoint/schema/actions';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { TABLE_COLUMN_NAMES, UX_MESSAGES, ARIA_LABELS } from '../translations';
import { getActionStatus, getUiCommand } from './hooks';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { StatusBadge } from './status_badge';
import { ActionsLogExpandedTray } from './action_log_expanded_tray';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { useActionHistoryUrlParams } from './use_action_history_url_params';
import { useUrlPagination } from '../../../hooks/use_url_pagination';

const emptyValue = getEmptyValue();

// Truncated usernames
const StyledFacetButton = euiStyled(EuiFacetButton)`
  .euiText {
    margin-top: 0.38rem;
    overflow-y: visible !important;
  }
`;

interface ActionsLogTableProps {
  error?: string;
  'data-test-subj'?: string;
  items: ActionListApiResponse['data'];
  isFlyout: boolean;
  loading: boolean;
  onChange: ({
    page: _page,
  }: CriteriaWithPagination<ActionListApiResponse['data'][number]>) => void;
  queryParams: EndpointActionListRequestQuery;
  showHostNames: boolean;
  totalItemCount: number;
}
interface ExpandedRowMapType {
  [k: ActionListApiResponse['data'][number]['id']]: React.ReactNode;
}

export const ActionsLogTable = memo<ActionsLogTableProps>(
  ({
    'data-test-subj': dataTestSubj,
    error,
    items,
    isFlyout,
    loading,
    onChange,
    queryParams,
    showHostNames,
    totalItemCount,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const { pagination: paginationFromUrlParams } = useUrlPagination();
    const { withOutputs, setUrlWithOutputs } = useActionHistoryUrlParams();

    const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<ExpandedRowMapType>(
      withOutputs
        ? withOutputs.reduce<ExpandedRowMapType>((idToRowMap, actionId) => {
            if (actionId.length) {
              idToRowMap[actionId] = (
                <ActionsLogExpandedTray
                  action={items.filter((item) => item.id === actionId)[0]}
                  data-test-subj={dataTestSubj}
                />
              );
            }
            return idToRowMap;
          }, {})
        : {}
    );

    const toggleDetails = useCallback(
      (item: ActionListApiResponse['data'][number]) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
        if (itemIdToExpandedRowMapValues[item.id]) {
          // close tray
          delete itemIdToExpandedRowMapValues[item.id];
        } else {
          // expanded tray contents
          itemIdToExpandedRowMapValues[item.id] = (
            <ActionsLogExpandedTray action={item} data-test-subj={dataTestSubj} />
          );
        }
        const expandedActionIds = Object.keys(itemIdToExpandedRowMapValues);
        if (!isFlyout) {
          // set and show `withOutputs` URL param on history page
          setUrlWithOutputs(expandedActionIds.join());
        }
        setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
      },
      [dataTestSubj, isFlyout, itemIdToExpandedRowMap, setUrlWithOutputs]
    );
    // memoized callback for toggleDetails
    const onClickCallback = useCallback(
      (actionListDataItem: ActionListApiResponse['data'][number]) => () =>
        toggleDetails(actionListDataItem),
      [toggleDetails]
    );

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
                    _status === 'failed'
                      ? 'danger'
                      : _status === 'successful'
                      ? 'success'
                      : 'warning'
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
            return (
              <EuiButtonIcon
                data-test-subj={getTestId('expand-button')}
                onClick={onClickCallback(actionListDataItem)}
                aria-label={
                  itemIdToExpandedRowMap[actionListDataItem.id]
                    ? ARIA_LABELS.collapse
                    : ARIA_LABELS.expand
                }
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

    return (
      <>
        {recordRangeLabel}
        <EuiHorizontalRule margin="xs" />
        <EuiBasicTable
          data-test-subj={dataTestSubj}
          items={items}
          columns={responseActionListColumns}
          itemId="id"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable
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
