/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { last } from 'lodash';
import React, { useCallback, useState } from 'react';
import type { EntityType } from '../../../common/entities';
import {
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '../../../common/es_fields/entities';
import type { APIReturnType } from '../../api';
import { getEntityTypeLabel } from '../../utils/get_entity_type_label';
import { BadgeFilterWithPopover } from '../badge_filter_with_popover';
import { EntityName } from './entity_name';

type InventoryEntitiesAPIReturnType = APIReturnType<'GET /internal/inventory/entities'>;
type LatestEntities = InventoryEntitiesAPIReturnType['entities'];

export type EntityColumnIds =
  | typeof ENTITY_DISPLAY_NAME
  | typeof ENTITY_LAST_SEEN
  | typeof ENTITY_TYPE;

const CustomHeaderCell = ({ title, tooltipContent }: { title: string; tooltipContent: string }) => (
  <>
    <span>{title}</span>
    <EuiToolTip content={tooltipContent}>
      <EuiButtonIcon
        data-test-subj="inventoryCustomHeaderCellButton"
        iconType="questionInCircle"
        aria-label={tooltipContent}
        color="primary"
      />
    </EuiToolTip>
  </>
);

const entityNameLabel = i18n.translate('xpack.inventory.entitiesGrid.euiDataGrid.entityNameLabel', {
  defaultMessage: 'Entity name',
});
const entityTypeLabel = i18n.translate('xpack.inventory.entitiesGrid.euiDataGrid.typeLabel', {
  defaultMessage: 'Type',
});
const entityLastSeenLabel = i18n.translate(
  'xpack.inventory.entitiesGrid.euiDataGrid.lastSeenLabel',
  {
    defaultMessage: 'Last seen',
  }
);

const columns: EuiDataGridColumn[] = [
  {
    id: ENTITY_DISPLAY_NAME,
    // keep it for accessibility purposes
    displayAsText: entityNameLabel,
    display: (
      <CustomHeaderCell
        title={entityNameLabel}
        tooltipContent="Name of the entity (entity.displayName)"
      />
    ),
    isSortable: true,
  },
  {
    id: ENTITY_TYPE,
    // keep it for accessibility purposes
    displayAsText: entityTypeLabel,
    display: (
      <CustomHeaderCell title={entityTypeLabel} tooltipContent="Type of entity (entity.type)" />
    ),
    isSortable: true,
  },
  {
    id: ENTITY_LAST_SEEN,
    // keep it for accessibility purposes
    displayAsText: entityLastSeenLabel,
    display: (
      <CustomHeaderCell
        title={entityLastSeenLabel}
        tooltipContent="Timestamp of last received data for entity (entity.lastSeenTimestamp)"
      />
    ),
    defaultSortDirection: 'desc',
    isSortable: true,
    schema: 'datetime',
  },
];

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
  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  const onSort: EuiDataGridSorting['onSort'] = useCallback(
    (newSortingColumns) => {
      const lastItem = last(newSortingColumns);
      if (lastItem) {
        onChangeSort(lastItem);
      }
    },
    [onChangeSort]
  );

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const entity = entities[rowIndex];
      if (entity === undefined) {
        return null;
      }

      const columnEntityTableId = columnId as EntityColumnIds;
      switch (columnEntityTableId) {
        case ENTITY_TYPE:
          const entityType = entity[columnEntityTableId] as EntityType;
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
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
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
