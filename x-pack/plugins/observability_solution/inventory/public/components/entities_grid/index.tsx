/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridSorting,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { last } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { EntityColumnIds, InventoryEntity } from '../../../common/entities';
import { BadgeFilterWithPopover } from '../badge_filter_with_popover';
import { getColumns } from './grid_columns';
import { AlertsBadge } from '../alerts_badge/alerts_badge';
import { EntityName } from './entity_name';
import { EntityActions } from '../entity_actions';

interface Props {
  loading: boolean;
  entities: InventoryEntity[];
  sortDirection: 'asc' | 'desc';
  sortField: string;
  pageIndex: number;
  onChangeSort: (sorting: EuiDataGridSorting['columns'][0]) => void;
  onChangePage: (nextPage: number) => void;
}

const PAGE_SIZE = 20;

export function EntitiesGrid({
  entities,
  loading,
  sortDirection,
  sortField,
  pageIndex,
  onChangePage,
  onChangeSort,
}: Props) {
  const [showActions, setShowActions] = useState<boolean>(true);

  const onSort: EuiDataGridSorting['onSort'] = useCallback(
    (newSortingColumns) => {
      const lastItem = last(newSortingColumns);
      if (lastItem) {
        onChangeSort(lastItem);
      }
    },
    [onChangeSort]
  );

  const showAlertsColumn = useMemo(
    () => entities?.some((entity) => entity?.alertsCount && entity?.alertsCount > 0),
    [entities]
  );

  const columnVisibility = useMemo(
    () => ({
      visibleColumns: getColumns({ showAlertsColumn, showActions }).map(({ id }) => id),
      setVisibleColumns: () => {},
    }),
    [showAlertsColumn, showActions]
  );

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const entity = entities[rowIndex];
      if (entity === undefined) {
        return null;
      }

      const columnEntityTableId = columnId as EntityColumnIds;
      const entityType = entity.entityType;

      switch (columnEntityTableId) {
        case 'alertsCount':
          return entity?.alertsCount ? <AlertsBadge entity={entity} /> : null;

        case 'entityType':
          return <BadgeFilterWithPopover field={ENTITY_TYPE} value={entityType} />;

        case 'entityLastSeenTimestamp':
          return (
            <FormattedMessage
              id="xpack.inventory.entitiesGrid.euiDataGrid.lastSeen"
              defaultMessage="{date} @ {time}"
              values={{
                date: (
                  <FormattedDate
                    value={entity.entityLastSeenTimestamp}
                    month="short"
                    day="numeric"
                    year="numeric"
                  />
                ),
                time: (
                  <FormattedTime
                    value={entity.entityLastSeenTimestamp}
                    hour12={false}
                    hour="2-digit"
                    minute="2-digit"
                    second="2-digit"
                  />
                ),
              }}
            />
          );
        case 'entityDisplayName':
          return <EntityName entity={entity} />;
        case 'actions':
          return <EntityActions entity={entity} setShowActions={setShowActions} />;
        default:
          return null;
      }
    },
    [entities]
  );

  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }

  const currentPage = pageIndex + 1;

  return (
    <EuiDataGrid
      aria-label={i18n.translate(
        'xpack.inventory.entitiesGrid.euiDataGrid.inventoryEntitiesGridLabel',
        { defaultMessage: 'Inventory entities grid' }
      )}
      columns={getColumns({ showAlertsColumn, showActions })}
      columnVisibility={columnVisibility}
      rowCount={entities.length}
      renderCellValue={renderCellValue}
      gridStyle={{ border: 'horizontal', header: 'shade' }}
      toolbarVisibility={{
        showColumnSelector: false,
        showSortSelector: false,
        additionalControls: {
          left: {
            prepend: (
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.inventory.entitiesGrid.euiDataGrid.headerLeft"
                  defaultMessage="Showing {currentItems} of {total} {boldEntities}"
                  values={{
                    currentItems: (
                      <strong>
                        {Math.min(entities.length, pageIndex * PAGE_SIZE + 1)}-
                        {Math.min(entities.length, PAGE_SIZE * currentPage)}
                      </strong>
                    ),
                    total: entities.length,
                    boldEntities: (
                      <strong>
                        {i18n.translate(
                          'xpack.inventory.entitiesGrid.euiDataGrid.headerLeft.entities',
                          { defaultMessage: 'Entities' }
                        )}
                      </strong>
                    ),
                  }}
                />
              </EuiText>
            ),
          },
        },
      }}
      sorting={{ columns: [{ id: sortField, direction: sortDirection }], onSort }}
      pagination={{
        pageIndex,
        pageSize: PAGE_SIZE,
        onChangeItemsPerPage: () => {},
        onChangePage,
        pageSizeOptions: [],
      }}
    />
  );
}
