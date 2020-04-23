/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  // @ts-ignore
  EuiSuggest,
  EuiFlexGroup,
  EuiButton,
  EuiSpacer,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedTime } from '@kbn/i18n/react';
import { AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../../../constants';
import { Agent, AgentEvent } from '../../../../types';
import { usePagination, useGetOneAgentEvents } from '../../../../hooks';
import { SearchBar } from '../../../../components/search_bar';

function useSearch() {
  const [state, setState] = useState<{ search: string }>({
    search: '',
  });

  const setSearch = (s: string) =>
    setState({
      search: s,
    });

  return {
    ...state,
    setSearch,
  };
}

export const AgentEventsTable: React.FunctionComponent<{ agent: Agent }> = ({ agent }) => {
  const { pageSizeOptions, pagination, setPagination } = usePagination();
  const { search, setSearch } = useSearch();

  const { isLoading, data, sendRequest } = useGetOneAgentEvents(agent.id, {
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: search && search.trim() !== '' ? search.trim() : undefined,
  });

  const refresh = () => sendRequest();

  const total = data ? data.total : 0;
  const list = data ? data.list : [];
  const paginationOptions = {
    pageIndex: pagination.currentPage - 1,
    pageSize: pagination.pageSize,
    totalItemCount: total,
    pageSizeOptions,
  };

  const columns = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.ingestManager.agentEventsList.timestampColumnTitle', {
        defaultMessage: 'Timestamp',
      }),
      render: (timestamp: string) => (
        <FormattedTime value={new Date(timestamp)} month="numeric" day="numeric" year="numeric" />
      ),
      sortable: true,
    },
    {
      field: 'type',
      name: i18n.translate('xpack.ingestManager.agentEventsList.typeColumnTitle', {
        defaultMessage: 'Type',
      }),
      width: '90px',
    },
    {
      field: 'subtype',
      name: i18n.translate('xpack.ingestManager.agentEventsList.subtypeColumnTitle', {
        defaultMessage: 'Subtype',
      }),
      width: '90px',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.ingestManager.agentEventsList.messageColumnTitle', {
        defaultMessage: 'Message',
      }),
    },
    {
      field: 'payload',
      name: i18n.translate('xpack.ingestManager.agentEventsList.paylodColumnTitle', {
        defaultMessage: 'Payload',
      }),
      truncateText: true,
      render: (payload: any) => (
        <span>
          <code>{payload && JSON.stringify(payload, null, 2)}</code>
        </span>
      ),
    },
  ];

  const onClickRefresh = () => {
    refresh();
  };

  const onChange = ({ page }: { page: { index: number; size: number } }) => {
    const newPagination = {
      ...pagination,
      currentPage: page.index + 1,
      pageSize: page.size,
    };

    setPagination(newPagination);
  };

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.ingestManager.agentEventsList.title"
            defaultMessage="Activity Log"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <SearchBar
            value={search}
            onChange={setSearch}
            fieldPrefix={AGENT_EVENT_SAVED_OBJECT_TYPE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={null}>
          <EuiButton color="secondary" iconType="refresh" onClick={onClickRefresh}>
            <FormattedMessage
              id="xpack.ingestManager.agentEventsList.refreshButton"
              defaultMessage="Refresh"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable<AgentEvent>
        onChange={onChange}
        items={list}
        columns={columns}
        pagination={paginationOptions}
        loading={isLoading}
      />
    </>
  );
};
