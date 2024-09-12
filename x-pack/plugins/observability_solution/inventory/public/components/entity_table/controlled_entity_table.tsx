/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventorySearchBar } from '../inventory_search_bar';

export function ControlledEntityTable<TEntity extends { id: string; name: string; type: string }>({
  rows,
  columns,
  loading,
  kqlFilter,
  onKqlFilterChange,
  onKqlFilterSubmit,
  pagination: { pageSize, pageIndex },
  onPaginationChange,
  totalItemCount,
  dataViews,
}: {
  rows: TEntity[];
  columns: Array<EuiBasicTableColumn<TEntity>>;
  kqlFilter: string;
  onKqlFilterChange: (nextKql: string) => void;
  onKqlFilterSubmit: () => void;
  loading: boolean;
  pagination: { pageSize: number; pageIndex: number };
  onPaginationChange: (pagination: { pageSize: number; pageIndex: number }) => void;
  totalItemCount: number;
  dataViews?: DataView[];
}) {
  const router = useInventoryRouter();

  const displayedColumns = useMemo<Array<EuiBasicTableColumn<TEntity>>>(() => {
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.inventory.entityTable.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        width: '80%',
        render: (_, { id, type, name }) => {
          return (
            <EuiLink
              data-test-subj="inventoryColumnsLink"
              href={router.link('/{type}/{id}', {
                path: {
                  id,
                  type,
                },
              })}
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'type',
        name: i18n.translate('xpack.inventory.entityTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        render: (_, { type }) => {
          return <EuiBadge>{type}</EuiBadge>;
        },
      },
    ];
  }, [router]);

  const displayedRows = useMemo(
    () => rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [rows, pageIndex, pageSize]
  );

  return (
    <EuiFlexGroup direction="column">
      <InventorySearchBar
        query={kqlFilter}
        onQueryChange={({ query }) => {
          onKqlFilterChange(query);
        }}
        onQuerySubmit={() => {
          onKqlFilterSubmit();
        }}
        placeholder={i18n.translate('xpack.inventory.entityTable.filterEntitiesPlaceholder', {
          defaultMessage: 'Filter entities',
        })}
        dataViews={dataViews}
      />
      <EuiBasicTable<TEntity>
        columns={displayedColumns}
        items={displayedRows}
        itemId="name"
        pagination={{
          pageSize,
          pageIndex,
          totalItemCount,
        }}
        loading={loading}
        noItemsMessage={i18n.translate('xpack.inventory.entityTable.noItemsMessage', {
          defaultMessage: `No entities found`,
        })}
        onChange={(criteria: CriteriaWithPagination<TEntity>) => {
          const { size, index } = criteria.page;
          onPaginationChange({ pageIndex: index, pageSize: size });
        }}
      />
    </EuiFlexGroup>
  );
}
