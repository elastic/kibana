/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { EuiBasicTable, EuiCodeBlock, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PlatformIcons } from './queries/platforms';
import { OsqueryManagerPackagePolicyInputStream } from '../../common/types';

interface ScheduledQueryGroupQueriesTableProps {
  data: OsqueryManagerPackagePolicyInputStream[];
  onDeleteClick?: (item: OsqueryManagerPackagePolicyInputStream) => void;
  onEditClick?: (item: OsqueryManagerPackagePolicyInputStream) => void;
  selectedItems?: OsqueryManagerPackagePolicyInputStream[];
  setSelectedItems?: (selection: OsqueryManagerPackagePolicyInputStream[]) => void;
}

const ScheduledQueryGroupQueriesTableComponent: React.FC<ScheduledQueryGroupQueriesTableProps> = ({
  data,
  onDeleteClick,
  onEditClick,
  selectedItems,
  setSelectedItems,
}) => {
  const renderDeleteAction = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => (
      <EuiButtonIcon
        color="danger"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onDeleteClick(item)}
        iconType="trash"
        aria-label={i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.deleteActionAriaLabel',
          {
            defaultMessage: 'Delete {queryName}',
            values: {
              queryName: item.vars?.id.value,
            },
          }
        )}
      />
    ),
    [onDeleteClick]
  );

  const renderEditAction = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => (
      <EuiButtonIcon
        color="primary"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onEditClick(item)}
        iconType="pencil"
        aria-label={i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.editActionAriaLabel',
          {
            defaultMessage: 'Edit {queryName}',
            values: {
              queryName: item.vars?.id.value,
            },
          }
        )}
      />
    ),
    [onEditClick]
  );

  const renderQueryColumn = useCallback(
    (query: string) => (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {query}
      </EuiCodeBlock>
    ),
    []
  );

  const renderPlatformColumn = useCallback(
    (platform: string) => <PlatformIcons platform={platform} />,
    []
  );

  const renderVersionColumn = useCallback(
    (version: string) =>
      version
        ? `${version}`
        : i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.osqueryVersionAllLabel', {
            defaultMessage: 'ALL',
          }),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'vars.id.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '20%',
      },
      {
        field: 'vars.interval.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.intervalColumnTitle', {
          defaultMessage: 'Interval (s)',
        }),
        width: '100px',
      },
      {
        field: 'vars.query.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        render: renderQueryColumn,
      },
      {
        field: 'vars.platform.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.platformColumnTitle', {
          defaultMessage: 'Platform',
        }),
        render: renderPlatformColumn,
      },
      {
        field: 'vars.version.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.versionColumnTitle', {
          defaultMessage: 'Min Osquery version',
        }),
        render: renderVersionColumn,
      },
      {
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        actions: [
          {
            render: renderEditAction,
          },
          {
            render: renderDeleteAction,
          },
        ],
      },
    ],
    [
      renderDeleteAction,
      renderEditAction,
      renderPlatformColumn,
      renderQueryColumn,
      renderVersionColumn,
    ]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'vars.id.value' as keyof OsqueryManagerPackagePolicyInputStream,
        direction: 'asc' as const,
      },
    }),
    []
  );

  const itemId = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => get('vars.id.value', item),
    []
  );

  const selection = useMemo(
    () => ({
      onSelectionChange: setSelectedItems,
      initialSelected: selectedItems,
    }),
    [selectedItems, setSelectedItems]
  );

  return (
    <EuiBasicTable<OsqueryManagerPackagePolicyInputStream>
      items={data}
      itemId={itemId}
      columns={columns}
      sorting={sorting}
      selection={selection}
      isSelectable
    />
  );
};

export const ScheduledQueryGroupQueriesTable = React.memo(ScheduledQueryGroupQueriesTableComponent);
