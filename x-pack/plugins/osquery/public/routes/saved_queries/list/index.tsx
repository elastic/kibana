/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  // EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  // RIGHT_ALIGNMENT,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';
// import { useHistory } from 'react-router-dom';
// import qs from 'query-string';
import { FormattedMessage } from '@kbn/i18n/react';

import { SavedObject } from 'kibana/public';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const EditButton = ({ savedQueryId, savedQueryName }) => {
  const buttonProps = useRouterNavigate(`saved_queries/${savedQueryId}`);

  return (
    <EuiButtonIcon
      color="primary"
      {...buttonProps}
      iconType="pencil"
      aria-label={i18n.translate('xpack.osquery.savedQueryList.queriesTable.editActionAriaLabel', {
        defaultMessage: 'Edit {queryName}',
        values: {
          queryName: savedQueryName,
        },
      })}
    />
  );
};

const SavedQueriesPageComponent = () => {
  const newQueryLinkProps = useRouterNavigate('saved_queries/new');
  useBreadcrumbs('saved_queries');
  // const { push } = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
  // const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, unknown>>({});
  const { http } = useKibana().services;

  const { data = {} } = useQuery(
    ['savedQueryList', { pageIndex, pageSize, sortField, sortDirection }],
    () =>
      http.get('/internal/osquery/saved_query', {
        query: {
          pageIndex,
          pageSize,
          sortField,
          sortDirection,
        },
      }),
    {
      keepPreviousData: true,
      // Refetch the data every 10 seconds
      refetchInterval: 5000,
    }
  );
  const { total = 0, saved_objects: savedQueries } = data;

  // const toggleDetails = useCallback(
  //   (item) => () => {
  //     const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
  //     if (itemIdToExpandedRowMapValues[item.id]) {
  //       delete itemIdToExpandedRowMapValues[item.id];
  //     } else {
  //       itemIdToExpandedRowMapValues[item.id] = (
  //         <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
  //           {item.attributes.query}
  //         </EuiCodeBlock>
  //       );
  //     }
  //     setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  //   },
  //   [itemIdToExpandedRowMap]
  // );

  // const renderExtendedItemToggle = useCallback(
  //   (item) => (
  //     <EuiButtonIcon
  //       onClick={toggleDetails(item)}
  //       aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
  //       iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
  //     />
  //   ),
  //   [itemIdToExpandedRowMap, toggleDetails]
  // );

  // const handleEditClick = useCallback((item) => onEditClick(item.id), [onEditClick]);

  // const handlePlayClick = useCallback(
  //   (item) =>
  //     push({
  //       search: qs.stringify({
  //         tab: 'live_query',
  //       }),
  //       state: {
  //         query: {
  //           id: item.id,
  //           query: item.attributes.query,
  //         },
  //       },
  //     }),
  //   [push]
  // );

  const renderEditAction = useCallback(
    (item: SavedObject<{ name: string }>) => (
      <EditButton savedQueryId={item.id} savedQueryName={item.name} />
    ),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'attributes.name',
        name: 'Query name',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'attributes.description',
        name: 'Description',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'updated_at',
        name: 'Last updated at',
        sortable: true,
        truncateText: true,
      },
      {
        name: 'Actions',
        actions: [
          // {
          //   name: 'Live query',
          //   description: 'Run live query',
          //   type: 'icon',
          //   icon: 'play',
          //   onClick: handlePlayClick,
          // },
          { render: renderEditAction },
        ],
      },
      // {
      //   align: RIGHT_ALIGNMENT,
      //   width: '40px',
      //   isExpander: true,
      //   render: renderExtendedItemToggle,
      // },
    ],
    [renderEditAction]
  );

  const onTableChange = useCallback(({ page = {}, sort = {} }) => {
    setPageIndex(page.index);
    setPageSize(page.size);
    setSortField(sort.field);
    setSortDirection(sort.direction);
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: total,
      pageSizeOptions: [3, 5, 8],
    }),
    [total, pageIndex, pageSize]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortDirection, sortField]
  );

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.savedQueryList.pageTitle"
                defaultMessage="Saved queries"
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton fill {...newQueryLinkProps} iconType="plusInCircle">
        <FormattedMessage
          id="xpack.osquery.savedQueryList.addSavedQueryButtonLabel"
          defaultMessage="Add saved query"
        />
      </EuiButton>
    ),
    [newQueryLinkProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {savedQueries && (
        <EuiBasicTable
          items={savedQueries}
          itemId="id"
          columns={columns}
          pagination={pagination}
          // @ts-expect-error update types
          sorting={sorting}
          onChange={onTableChange}
          // // @ts-expect-error update types
          // itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          rowHeader="id"
        />
      )}
    </WithHeaderLayout>
  );
};

export const QueriesPage = React.memo(SavedQueriesPageComponent);
