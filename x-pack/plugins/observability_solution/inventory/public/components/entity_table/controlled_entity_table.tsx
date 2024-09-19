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
  EuiFlexItem,
  EuiLink,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/data-plugin/common';
import { css } from '@emotion/css';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventorySearchBar } from '../inventory_search_bar';
import { Entity } from '../../../common/entities';

export function ControlledEntityTable({
  rows,
  columns,
  loading,
  timeRange,
  onTimeRangeChange,
  kqlFilter,
  onKqlFilterChange,
  onKqlFilterSubmit,
  pagination: { pageSize, pageIndex },
  onPaginationChange,
  totalItemCount,
  dataViews,
  showTypeSelect,
  selectedType,
  availableTypes,
  onSelectedTypeChange,
}: {
  rows: Entity[];
  columns: Array<EuiBasicTableColumn<Entity>>;
  kqlFilter: string;
  timeRange: TimeRange;
  onTimeRangeChange: (nextTimeRange: TimeRange) => void;
  onKqlFilterChange: (nextKql: string) => void;
  onKqlFilterSubmit: () => void;
  loading: boolean;
  pagination: { pageSize: number; pageIndex: number };
  onPaginationChange: (pagination: { pageSize: number; pageIndex: number }) => void;
  totalItemCount: number;
  dataViews?: DataView[];
  showTypeSelect?: boolean;
  selectedType?: string;
  onSelectedTypeChange?: (nextType: string) => void;
  availableTypes?: Array<{ label: string; value: string }>;
}) {
  const router = useInventoryRouter();

  const displayedColumns = useMemo<Array<EuiBasicTableColumn<Entity>>>(() => {
    return [
      {
        field: 'type',
        name: i18n.translate('xpack.inventory.entityTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        width: '96px',
        render: (_, { type }) => {
          return <EuiBadge>{type}</EuiBadge>;
        },
      },
      {
        field: 'name',
        name: i18n.translate('xpack.inventory.entityTable.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        render: (_, { type, displayName }) => {
          return (
            <EuiLink
              data-test-subj="inventoryColumnsLink"
              href={router.link('/{type}/{displayName}', {
                path: {
                  displayName,
                  type,
                },
              })}
            >
              {displayName}
            </EuiLink>
          );
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
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow>
          <InventorySearchBar
            query={kqlFilter}
            onQueryChange={({ query }) => {
              onKqlFilterChange(query);
            }}
            onQuerySubmit={({ dateRange }) => {
              onKqlFilterSubmit();
              if (dateRange) {
                onTimeRangeChange(dateRange);
              }
            }}
            placeholder={i18n.translate('xpack.inventory.entityTable.filterEntitiesPlaceholder', {
              defaultMessage: 'Filter entities',
            })}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
            dataViews={dataViews}
          />
        </EuiFlexItem>
        {showTypeSelect ? (
          <EuiFlexItem
            className={css`
              width: 192px;
            `}
            grow={false}
          >
            <EuiSelect
              data-test-subj="entityTableTypeSelect"
              value={selectedType}
              onChange={(event) => {
                onSelectedTypeChange?.(event.currentTarget.value);
              }}
              isLoading={!availableTypes}
              options={availableTypes?.map(({ value, label }) => ({ value, text: label }))}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiBasicTable<Entity>
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
        onChange={(criteria: CriteriaWithPagination<Entity>) => {
          const { size, index } = criteria.page;
          onPaginationChange({ pageIndex: index, pageSize: size });
        }}
      />
    </EuiFlexGroup>
  );
}
