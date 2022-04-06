/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBasicTableColumn,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';

import { SavedObject } from 'kibana/public';
import { ECSMapping } from '../../../../common/schemas/common';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { useSavedQueries } from '../../../saved_queries/use_saved_queries';

type SavedQuerySO = SavedObject<{
  name: string;
  id: string;
  query: string;
  ecs_mapping: ECSMapping;
  updated_at: string;
}>;

interface PlayButtonProps {
  disabled: boolean;
  savedQuery: SavedQuerySO;
}

const PlayButtonComponent: React.FC<PlayButtonProps> = ({ disabled = false, savedQuery }) => {
  const { push } = useHistory();

  // TODO: Add href
  const handlePlayClick = useCallback(
    () =>
      push('/live_queries/new', {
        form: {
          savedQueryId: savedQuery.id,
          query: savedQuery.attributes.query,
          ecs_mapping: savedQuery.attributes.ecs_mapping,
        },
      }),
    [push, savedQuery]
  );

  return (
    <EuiButtonIcon
      color="primary"
      iconType="play"
      isDisabled={disabled}
      onClick={handlePlayClick}
      aria-label={i18n.translate('xpack.osquery.savedQueryList.queriesTable.runActionAriaLabel', {
        defaultMessage: 'Run {savedQueryName}',
        values: {
          savedQueryName: savedQuery.attributes.name,
        },
      })}
    />
  );
};

const PlayButton = React.memo(PlayButtonComponent);

interface EditButtonProps {
  disabled?: boolean;
  savedQueryId: string;
  savedQueryName: string;
}

const EditButtonComponent: React.FC<EditButtonProps> = ({
  disabled = false,
  savedQueryId,
  savedQueryName,
}) => {
  const buttonProps = useRouterNavigate(`saved_queries/${savedQueryId}`);

  return (
    <EuiButtonIcon
      color="primary"
      {...buttonProps}
      iconType="pencil"
      isDisabled={disabled}
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
  const permissions = useKibana().services.application.capabilities.osquery;

  useBreadcrumbs('saved_queries');
  const newQueryLinkProps = useRouterNavigate('saved_queries/new');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('attributes.updated_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const { data } = useSavedQueries({ isLive: true });

  const renderEditAction = useCallback(
    (item: SavedQuerySO) => (
      <EditButton savedQueryId={item.id} savedQueryName={item.attributes.name} />
    ),
    []
  );

  const renderPlayAction = useCallback(
    (item: SavedQuerySO) =>
      permissions.runSavedQueries || permissions.writeLiveQueries ? (
        <PlayButton savedQuery={item} disabled={false} />
      ) : (
        <></>
      ),
    [permissions.runSavedQueries, permissions.writeLiveQueries]
  );

  const renderUpdatedAt = useCallback((updatedAt, item) => {
    if (!updatedAt) return '-';

    const updatedBy =
      item.attributes.updated_by !== item.attributes.created_by
        ? ` @ ${item.attributes.updated_by}`
        : '';

    return updatedAt ? `${moment(updatedAt).fromNow()}${updatedBy}` : '-';
  }, []);

  const columns: Array<EuiBasicTableColumn<SavedQuerySO>> = useMemo(
    () => [
      {
        field: 'attributes.id',
        name: i18n.translate('xpack.osquery.savedQueries.table.queryIdColumnTitle', {
          defaultMessage: 'Query ID',
        }),
        sortable: (item) => item.attributes.id.toLowerCase(),
        truncateText: true,
      },
      {
        field: 'attributes.description',
        name: i18n.translate('xpack.osquery.savedQueries.table.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
        truncateText: true,
      },
      {
        field: 'attributes.created_by',
        name: i18n.translate('xpack.osquery.savedQueries.table.createdByColumnTitle', {
          defaultMessage: 'Created by',
        }),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'attributes.updated_at',
        name: i18n.translate('xpack.osquery.savedQueries.table.updatedAtColumnTitle', {
          defaultMessage: 'Last updated at',
        }),
        sortable: (item) =>
          item.attributes.updated_at ? Date.parse(item.attributes.updated_at) : 0,
        truncateText: true,
        render: renderUpdatedAt,
      },
      {
        name: i18n.translate('xpack.osquery.savedQueries.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        actions: [{ render: renderPlayAction }, { render: renderEditAction }],
      },
    ],
    [renderEditAction, renderPlayAction, renderUpdatedAt]
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
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.savedQueryList.pageTitle"
                defaultMessage="Saved queries"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton
        fill
        {...newQueryLinkProps}
        iconType="plusInCircle"
        isDisabled={!permissions.writeSavedQueries}
      >
        <FormattedMessage
          id="xpack.osquery.savedQueryList.addSavedQueryButtonLabel"
          defaultMessage="Add saved query"
        />
      </EuiButton>
    ),
    [permissions.writeSavedQueries, newQueryLinkProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {data?.saved_objects && (
        <EuiInMemoryTable
          items={data?.saved_objects}
          itemId="id"
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
