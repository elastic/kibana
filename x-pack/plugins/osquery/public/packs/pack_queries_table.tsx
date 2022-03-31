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

export interface PackQueriesTableProps {
  data: OsqueryManagerPackagePolicyInputStream[];
  isReadOnly?: boolean;
  onDeleteClick?: (item: OsqueryManagerPackagePolicyInputStream) => void;
  onEditClick?: (item: OsqueryManagerPackagePolicyInputStream) => void;
  selectedItems?: OsqueryManagerPackagePolicyInputStream[];
  setSelectedItems?: (selection: OsqueryManagerPackagePolicyInputStream[]) => void;
}

const PackQueriesTableComponent: React.FC<PackQueriesTableProps> = ({
  data,
  isReadOnly,
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
        aria-label={i18n.translate('xpack.osquery.pack.queriesTable.deleteActionAriaLabel', {
          defaultMessage: 'Delete {queryName}',
          values: {
            queryName: item.id,
          },
        })}
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
        aria-label={i18n.translate('xpack.osquery.pack.queriesTable.editActionAriaLabel', {
          defaultMessage: 'Edit {queryName}',
          values: {
            queryName: item.id,
          },
        })}
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
        : i18n.translate('xpack.osquery.pack.queriesTable.osqueryVersionAllLabel', {
            defaultMessage: 'ALL',
          }),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'id',
        name: i18n.translate('xpack.osquery.pack.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '20%',
      },
      {
        field: 'interval',
        name: i18n.translate('xpack.osquery.pack.queriesTable.intervalColumnTitle', {
          defaultMessage: 'Interval (s)',
        }),
        width: '100px',
      },
      {
        field: 'query',
        name: i18n.translate('xpack.osquery.pack.queriesTable.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        render: renderQueryColumn,
      },
      {
        field: 'platform',
        name: i18n.translate('xpack.osquery.pack.queriesTable.platformColumnTitle', {
          defaultMessage: 'Platform',
        }),
        render: renderPlatformColumn,
      },
      {
        field: 'version',
        name: i18n.translate('xpack.osquery.pack.queriesTable.versionColumnTitle', {
          defaultMessage: 'Min Osquery version',
        }),
        render: renderVersionColumn,
      },
      ...(!isReadOnly
        ? [
            {
              name: i18n.translate('xpack.osquery.pack.queriesTable.actionsColumnTitle', {
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
          ]
        : []),
    ],
    [
      isReadOnly,
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
        field: 'id' as keyof OsqueryManagerPackagePolicyInputStream,
        direction: 'asc' as const,
      },
    }),
    []
  );

  const itemId = useCallback((item: OsqueryManagerPackagePolicyInputStream) => get('id', item), []);

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
      {...(!isReadOnly ? { selection, isSelectable: true } : {})}
    />
  );
};

export const PackQueriesTable = React.memo(PackQueriesTableComponent);
// eslint-disable-next-line import/no-default-export
export default PackQueriesTable;
