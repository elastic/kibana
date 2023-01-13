/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useGetEndpointActionList } from '../../../management/hooks';
import { useResponseActionsLogTable } from '../../../management/components/endpoint_response_actions_list/use_response_actions_log_table';
import { UX_MESSAGES } from '../../../management/components/endpoint_response_actions_list/translations';

// TODO this is just to render the table, very very early stage of implementation
export const EndpointResults = ({ alertId, agentIds }) => {
  const {
    error,
    data: actionList,
    isFetching,
    isFetched,
  } = useGetEndpointActionList(
    {
      alert_ids: alertId,
      agentIds,
    },
    { retry: false }
  );
  const totalItemCount = useMemo(() => actionList?.total ?? 0, [actionList]);

  const { itemIdToExpandedRowMap, responseActionListColumns, tablePagination } =
    useResponseActionsLogTable({
      showHostNames: true,
      pageSize: 100,
      queryParams: {
        agentIds,
      },
      // TODO add filtering just for this alert
      // queryParams: { alert_ids: alertId },
      totalItemCount: 100,
    });

  return isFetched && totalItemCount ? (
    <EuiBasicTable
      data-test-subj={'response-actions-log-table'}
      items={actionList?.data || []}
      columns={responseActionListColumns}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable
      pagination={tablePagination}
      onChange={() => null}
      loading={isFetching}
      error={error !== null ? UX_MESSAGES.fetchError : undefined}
    />
  ) : null;
};
