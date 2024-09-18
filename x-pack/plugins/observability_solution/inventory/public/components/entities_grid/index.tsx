/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { last } from 'lodash';
import React, { useCallback, useState } from 'react';
import {
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '../../../common/es_fields/entities';
import { APIReturnType } from '../../api';
import { MAX_NUMBER_OF_ENTITIES } from '../../../common/entities';

type InventoryEntitiesAPIReturnType = APIReturnType<'GET /internal/inventory/entities'>;

type EntityColumnIds = typeof ENTITY_DISPLAY_NAME | typeof ENTITY_LAST_SEEN | typeof ENTITY_TYPE;

const columns: EuiDataGridColumn[] = [
  {
    id: ENTITY_DISPLAY_NAME,
    displayAsText: 'Entity name',
    isSortable: true,
  },
  {
    id: ENTITY_TYPE,
    displayAsText: 'Type',
    isSortable: true,
  },
  {
    id: ENTITY_LAST_SEEN,
    displayAsText: 'Last seen',
    defaultSortDirection: 'desc',
    isSortable: true,
    schema: 'datetime',
  },
];

interface Props {
  loading: boolean;
  entities: InventoryEntitiesAPIReturnType['entities'];
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

  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }

  function CellValue({ rowIndex, columnId }: EuiDataGridCellValueElementProps) {
    const entity = entities[rowIndex];
    if (entity === undefined) {
      return null;
    }

    const columnEntityTableId = columnId as EntityColumnIds;
    switch (columnEntityTableId) {
      case ENTITY_TYPE:
        return <EuiBadge color="hollow">{entity[columnEntityTableId]}</EuiBadge>;
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
        return (
          // TODO: link to the appropriate page based on entity type https://github.com/elastic/kibana/issues/192676
          <EuiLink data-test-subj="inventoryCellValueLink">{entity[columnEntityTableId]}</EuiLink>
        );
      default:
        return entity[columnId as EntityColumnIds] || '';
    }
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
      renderCellValue={CellValue}
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
                        {pageIndex * PAGE_SIZE + 1}-{PAGE_SIZE * currentPage}
                      </strong>
                    ),
                    total: MAX_NUMBER_OF_ENTITIES,
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
