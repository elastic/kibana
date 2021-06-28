/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { SavedObject } from 'kibana/public';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';
import { useSavedQueries } from '../../../saved_queries/use_saved_queries';

interface EditButtonProps {
  savedQueryId: string;
  savedQueryName: string;
}

const EditButtonComponent: React.FC<EditButtonProps> = ({ savedQueryId, savedQueryName }) => {
  const buttonProps = useRouterNavigate(`saved_queries/${savedQueryId}`);

  return (
    <EuiButtonIcon
      color="primary"
      {...buttonProps}
      iconType="pencil"
      aria-label={i18n.translate('xpack.osquery.savedQueryList.queriesTable.editActionAriaLabel', {
        defaultMessage: 'Edit {savedQueryName}',
        values: {
          savedQueryName,
        },
      })}
    />
  );
};

const EditButton = React.memo(EditButtonComponent);

const SavedQueriesPageComponent = () => {
  useBreadcrumbs('saved_queries');
  const newQueryLinkProps = useRouterNavigate('saved_queries/new');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const { data } = useSavedQueries({ isLive: true });

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
      <EditButton savedQueryId={item.id} savedQueryName={item.attributes.name} />
    ),
    []
  );

  const renderUpdatedAt = useCallback((updatedAt, item) => {
    if (!updatedAt) return '-';

    const updatedBy =
      item.attributes.updated_by !== item.attributes.created_by
        ? ` @ ${item.attributes.updated_by}`
        : '';
    return updatedAt ? `${moment(updatedAt).fromNow()}${updatedBy}` : '-';
  }, []);

  const columns = useMemo(
    () => [
      {
        field: 'attributes.id',
        name: 'Query ID',
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
        field: 'attributes.created_by',
        name: 'Created by',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'attributes.updated_at',
        name: 'Last updated at',
        sortable: (item: SavedObject<{ updated_at: string }>) =>
          item.attributes.updated_at ? Date.parse(item.attributes.updated_at) : 0,
        truncateText: true,
        render: renderUpdatedAt,
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
    ],
    [renderEditAction, renderUpdatedAt]
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
      totalItemCount: data?.total ?? 0,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    [pageIndex, pageSize, data?.total]
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
      {data?.savedObjects && (
        <EuiInMemoryTable
          items={data?.savedObjects}
          itemId="id"
          // @ts-expect-error update types
          columns={columns}
          pagination={pagination}
          // @ts-expect-error update types
          sorting={sorting}
          onChange={onTableChange}
          rowHeader="id"
        />
      )}
    </WithHeaderLayout>
  );
};

export const QueriesPage = React.memo(SavedQueriesPageComponent);
