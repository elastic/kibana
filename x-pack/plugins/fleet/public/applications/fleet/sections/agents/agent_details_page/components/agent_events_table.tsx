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
  EuiBadge,
  EuiText,
  EuiButtonIcon,
  EuiCodeBlock,
} from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedTime } from '@kbn/i18n/react';
import { AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../../../constants';
import { Agent, AgentEvent } from '../../../../types';
import { usePagination, useGetOneAgentEvents } from '../../../../hooks';
import { SearchBar } from '../../../../components/search_bar';
import { TYPE_LABEL, SUBTYPE_LABEL } from './type_labels';

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
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
    [key: string]: JSX.Element;
  }>({});

  const { isLoading, data, resendRequest } = useGetOneAgentEvents(agent.id, {
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: search && search.trim() !== '' ? search.trim() : undefined,
  });

  const refresh = () => resendRequest();

  const total = data ? data.total : 0;
  const list = data ? data.list : [];
  const paginationOptions = {
    pageIndex: pagination.currentPage - 1,
    pageSize: pagination.pageSize,
    totalItemCount: total,
    pageSizeOptions,
  };

  const toggleDetails = (agentEvent: AgentEvent) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[agentEvent.id]) {
      delete itemIdToExpandedRowMapValues[agentEvent.id];
    } else {
      const details = (
        <div style={{ width: '100%' }}>
          <div>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.fleet.agentEventsList.messageDetailsTitle"
                  defaultMessage="Message"
                />
              </strong>
              <EuiSpacer size="xs" />
              <p>{agentEvent.message}</p>
            </EuiText>
          </div>
          {agentEvent.payload ? (
            <div>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="xpack.fleet.agentEventsList.payloadDetailsTitle"
                    defaultMessage="Payload"
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiCodeBlock language="json" paddingSize="s" overflowHeight={200}>
                {JSON.stringify(agentEvent.payload, null, 2)}
              </EuiCodeBlock>
            </div>
          ) : null}
        </div>
      );
      itemIdToExpandedRowMapValues[agentEvent.id] = details;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.fleet.agentEventsList.timestampColumnTitle', {
        defaultMessage: 'Timestamp',
      }),
      render: (timestamp: string) => (
        <FormattedTime
          value={new Date(timestamp)}
          month="short"
          day="numeric"
          year="numeric"
          hour="numeric"
          minute="numeric"
          second="numeric"
        />
      ),
      sortable: true,
      width: '18%',
    },
    {
      field: 'type',
      name: i18n.translate('xpack.fleet.agentEventsList.typeColumnTitle', {
        defaultMessage: 'Type',
      }),
      width: '10%',
      render: (type: AgentEvent['type']) =>
        TYPE_LABEL[type] || <EuiBadge color="hollow">{type}</EuiBadge>,
    },
    {
      field: 'subtype',
      name: i18n.translate('xpack.fleet.agentEventsList.subtypeColumnTitle', {
        defaultMessage: 'Subtype',
      }),
      width: '13%',
      render: (subtype: AgentEvent['subtype']) =>
        SUBTYPE_LABEL[subtype] || <EuiBadge color="hollow">{subtype}</EuiBadge>,
    },
    {
      field: 'message',
      name: i18n.translate('xpack.fleet.agentEventsList.messageColumnTitle', {
        defaultMessage: 'Message',
      }),
      render: (value: string) => (
        <EuiText size="xs" className="eui-textTruncate">
          {value}
        </EuiText>
      ),
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (agentEvent: AgentEvent) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(agentEvent)}
          aria-label={
            itemIdToExpandedRowMap[agentEvent.id]
              ? i18n.translate('xpack.fleet.agentEventsList.collapseDetailsAriaLabel', {
                  defaultMessage: 'Hide details',
                })
              : i18n.translate('xpack.fleet.agentEventsList.expandDetailsAriaLabel', {
                  defaultMessage: 'Show details',
                })
          }
          iconType={itemIdToExpandedRowMap[agentEvent.id] ? 'arrowUp' : 'arrowDown'}
        />
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
      <EuiFlexGroup>
        <EuiFlexItem>
          <SearchBar
            value={search}
            onChange={setSearch}
            fieldPrefix={AGENT_EVENT_SAVED_OBJECT_TYPE}
            placeholder={i18n.translate('xpack.fleet.agentEventsList.searchPlaceholderText', {
              defaultMessage: 'Search for activity logs',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={null}>
          <EuiButton iconType="refresh" onClick={onClickRefresh}>
            <FormattedMessage
              id="xpack.fleet.agentEventsList.refreshButton"
              defaultMessage="Refresh"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable<AgentEvent>
        onChange={onChange}
        items={list}
        itemId="id"
        columns={columns}
        pagination={paginationOptions}
        loading={isLoading}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      />
    </>
  );
};
