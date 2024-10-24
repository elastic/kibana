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
import React, { useCallback, useMemo } from 'react';
import {
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '@kbn/observability-shared-plugin/common';
import { EntityColumnIds, EntityType } from '../../../common/entities';
import { APIReturnType } from '../../api';
import { BadgeFilterWithPopover } from '../badge_filter_with_popover';
import { getColumns } from './grid_columns';
import { AlertsBadge } from '../alerts_badge/alerts_badge';
import { EntityName } from './entity_name';
import { getEntityTypeLabel } from '../../utils/get_entity_type_label';

type InventoryEntitiesAPIReturnType = APIReturnType<'GET /internal/inventory/entities'>;
type LatestEntities = InventoryEntitiesAPIReturnType['entities'];

interface Props {
  loading: boolean;
  entities: LatestEntities;
  sortDirection: 'asc' | 'desc';
  sortField: string;
  pageIndex: number;
  onChangeSort: (sorting: EuiDataGridSorting['columns'][0]) => void;
  onChangePage: (nextPage: number) => void;
  onFilterByType: (entityType: EntityType) => void;
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
  onFilterByType,
}: Props) {
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
      visibleColumns: getColumns({ showAlertsColumn }).map(({ id }) => id),
      setVisibleColumns: () => {},
    }),
    [showAlertsColumn]
  );

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const entity = entities[rowIndex];
      if (entity === undefined) {
        return null;
      }

      const columnEntityTableId = columnId as EntityColumnIds;
      switch (columnEntityTableId) {
        case 'alertsCount':
          return entity?.alertsCount ? <AlertsBadge entity={entity} /> : null;

        case ENTITY_TYPE:
          const entityType = entity[columnEntityTableId];
          return (
            <BadgeFilterWithPopover
              field={ENTITY_TYPE}
              value={entityType}
              label={getEntityTypeLabel(entityType)}
              onFilter={() => onFilterByType(entityType)}
            />
          );
        case ENTITY_LAST_SEEN:
          return (
            <FormattedMessage
              id="xpack.inventory.entitiesGrid.euiDataGrid.lastSeen"
              defaultMessage="{date} @ {time}"
              values={{
                date: (
                  <FormattedDate
                    value={entity[columnEntityTableId]}
                    month="short"
                    day="numeric"
                    year="numeric"
                  />
                ),
                time: (
                  <FormattedTime
                    value={entity[columnEntityTableId]}
                    hour12={false}
                    hour="2-digit"
                    minute="2-digit"
                    second="2-digit"
                  />
                ),
              }}
            />
          );
        case ENTITY_DISPLAY_NAME:
          return <EntityName entity={entity} />;
        default:
          return entity[columnId as EntityColumnIds] || '';
      }
    },
    [entities, onFilterByType]
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
      columns={getColumns({ showAlertsColumn })}
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
                  defaultMessage="Showing {currentItems} of {total} {boldEntites}"
                  values={{
                    currentItems: (
                      <strong>
                        {Math.min(entities.length, pageIndex * PAGE_SIZE + 1)}-
                        {Math.min(entities.length, PAGE_SIZE * currentPage)}
                      </strong>
                    ),
                    total: entities.length,
                    boldEntites: (
                      <strong>
                        {i18n.translate(
                          'xpack.inventory.entitiesGrid.euiDataGrid.headerLeft.entites',
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
