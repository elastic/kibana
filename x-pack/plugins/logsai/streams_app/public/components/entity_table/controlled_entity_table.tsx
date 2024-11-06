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
import type { EntityWithSignalStatus } from '@kbn/entities-api-plugin/common';
import React, { useMemo } from 'react';
import { useEntitiesAppRouter } from '../../hooks/use_entities_app_router';
import { EntitiesAppSearchBar } from '../entities_app_search_bar';
import { EntityHealthStatusBadge } from '../entity_health_status_badge';

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
  rows: EntityWithSignalStatus[];
  columns: Array<EuiBasicTableColumn<EntityWithSignalStatus>>;
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
  sort?: { field: string; order: 'asc' | 'desc' };
  onSortChange?: (nextSort: { field: string; order: 'asc' | 'desc' }) => void;
}) {
  const router = useEntitiesAppRouter();

  const displayedColumns = useMemo<Array<EuiBasicTableColumn<EntityWithSignalStatus>>>(() => {
    return [
      {
        field: 'entity.type',
        name: i18n.translate('xpack.entities.entityTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        width: '96px',
        render: (_, { type }) => {
          return <EuiBadge>{type}</EuiBadge>;
        },
      },
      {
        field: 'entity.displayName',
        name: i18n.translate('xpack.entities.entityTable.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (_, { type, key, displayName }) => {
          return (
            <EuiLink
              data-test-subj="entityColumnsLink"
              href={router.link('/{type}/{key}', {
                path: {
                  key,
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
        name: i18n.translate('xpack.entities.entityTable.healthStatusColumnLabel', {
          defaultMessage: 'Health status',
        }),
        sortable: true,
        width: '96px',
        render: (_, { healthStatus }) => {
          if (healthStatus) {
            return <EntityHealthStatusBadge healthStatus={healthStatus} />;
          }

          return <></>;
        },
      },
      {
        field: 'alerts',
        name: i18n.translate('xpack.entities.entityTable.alertsColumnLabel', {
          defaultMessage: 'Alerts',
        }),
        sortable: true,
        width: '96px',
        render: (_, { alertsCount }) => {
          if (!alertsCount) {
            return <></>;
          }
          return <EuiBadge color="danger">{alertsCount}</EuiBadge>;
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
          <EntitiesAppSearchBar
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
            placeholder={i18n.translate('xpack.entities.entityTable.filterEntitiesPlaceholder', {
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
      <EuiBasicTable<EntityWithSignalStatus>
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
        noItemsMessage={i18n.translate('xpack.entities.entityTable.noItemsMessage', {
          defaultMessage: `No entities found`,
        })}
        onChange={(criteria: CriteriaWithPagination<EntityWithSignalStatus>) => {
          const { size, index } = criteria.page;
          onPaginationChange({ pageIndex: index, pageSize: size });
          if (criteria.sort) {
            onSortChange?.({
              field: criteria.sort.field,
              order: criteria.sort.direction,
            });
          }
        }}
      />
    </EuiFlexGroup>
  );
}
