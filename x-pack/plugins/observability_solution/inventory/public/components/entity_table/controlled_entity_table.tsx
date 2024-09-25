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
import { css } from '@emotion/css';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { EntitySortField, EntityWithSignalCounts } from '../../../common/entities';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventorySearchBar } from '../inventory_search_bar';

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
  sort,
  onSortChange,
}: {
  rows: EntityWithSignalCounts[];
  columns: Array<EuiBasicTableColumn<EntityWithSignalCounts>>;
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
  sort?: { field: EntitySortField; order: 'asc' | 'desc' };
  onSortChange?: (nextSort: { field: EntitySortField; order: 'asc' | 'desc' }) => void;
}) {
  const router = useInventoryRouter();

  const displayedColumns = useMemo<Array<EuiBasicTableColumn<EntityWithSignalCounts>>>(() => {
    return [
      {
        field: 'entity.type',
        name: i18n.translate('xpack.inventory.entityTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        width: '96px',
        render: (_, { type }) => {
          return <EuiBadge>{type}</EuiBadge>;
        },
      },
      {
        field: 'entity.displayName',
        name: i18n.translate('xpack.inventory.entityTable.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        sortable: true,
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
      {
        field: 'slos',
        name: i18n.translate('xpack.inventory.entityTable.slosColumnLabel', {
          defaultMessage: 'Health status',
        }),
        sortable: true,
        width: '96px',
        render: (_, { slos }) => {
          if (slos.violated > 0) {
            return (
              <EuiBadge color="danger">
                {i18n.translate('xpack.inventory.displayedColumns.violatedBadgeLabel', {
                  defaultMessage: 'Violated',
                })}
              </EuiBadge>
            );
          }

          const isMixed = Object.values(slos).filter((count) => count > 0).length > 1;

          if (isMixed) {
            return (
              <EuiBadge color="warning">
                {i18n.translate('xpack.inventory.displayedColumns.mixedBadgeLabel', {
                  defaultMessage: 'Mixed',
                })}
              </EuiBadge>
            );
          }

          if (slos.no_data) {
            return (
              <EuiBadge color="text">
                {i18n.translate('xpack.inventory.displayedColumns.noDataBadgeLabel', {
                  defaultMessage: 'No data',
                })}
              </EuiBadge>
            );
          }

          if (slos.degraded) {
            return (
              <EuiBadge color="text">
                {i18n.translate('xpack.inventory.displayedColumns.degradedBadgeLabel', {
                  defaultMessage: 'Degraded',
                })}
              </EuiBadge>
            );
          }

          if (slos.healthy) {
            return (
              <EuiBadge color="success">
                {i18n.translate('xpack.inventory.displayedColumns.healthyBadgeLabel', {
                  defaultMessage: 'Healthy',
                })}
              </EuiBadge>
            );
          }

          return <></>;
        },
      },
      {
        field: 'alerts',
        name: i18n.translate('xpack.inventory.entityTable.alertsColumnLabel', {
          defaultMessage: 'Alerts',
        }),
        sortable: true,
        width: '96px',
        render: (_, { alerts }) => {
          if (!alerts.active) {
            return <></>;
          }
          return <EuiBadge color="danger">{alerts.active}</EuiBadge>;
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
      <EuiBasicTable<EntityWithSignalCounts>
        columns={displayedColumns}
        items={displayedRows}
        itemId="name"
        pagination={{
          pageSize,
          pageIndex,
          totalItemCount,
        }}
        sorting={
          sort
            ? {
                sort: {
                  direction: sort.order,
                  field: sort.field as any,
                },
              }
            : {}
        }
        loading={loading}
        noItemsMessage={i18n.translate('xpack.inventory.entityTable.noItemsMessage', {
          defaultMessage: `No entities found`,
        })}
        onChange={(criteria: CriteriaWithPagination<EntityWithSignalCounts>) => {
          const { size, index } = criteria.page;
          onPaginationChange({ pageIndex: index, pageSize: size });
          if (criteria.sort) {
            onSortChange?.({
              field: criteria.sort.field as EntitySortField,
              order: criteria.sort.direction,
            });
          }
        }}
      />
    </EuiFlexGroup>
  );
}
