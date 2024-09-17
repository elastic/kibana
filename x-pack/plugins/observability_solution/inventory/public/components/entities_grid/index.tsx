/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';

const columns: EuiDataGridColumn[] = [
  {
    id: 'entityName',
    displayAsText: 'Entity name',
  },
  {
    id: 'entityType',
    displayAsText: 'Type',
  },
  {
    id: 'availablityZone',
    displayAsText: 'Availability zone',
  },
  {
    id: 'lastSeen',
    displayAsText: 'Last seen',
  },
];

export function EntitiesGrid() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));
  const { value = { entities: [] }, loading } = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }

  function CellValue({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) {
    const data = value.entities[rowIndex];
    if (data === undefined) {
      return null;
    }

    switch (columnId) {
      case 'entityName':
        return data.entity.displayName;
      case 'entityType':
        return data.data_stream.type;
      case 'availablityZone':
        return data.cloud?.availability_zone || 'N/A';
      case 'lastSeen':
        return data.entity.lastSeenTimestamp;
      default:
        return 'N/A';
    }
  }

  return (
    <EuiDataGrid
      aria-label={i18n.translate(
        'xpack.inventory.entitiesGrid.euiDataGrid.inventoryEntitiesGridLabel',
        { defaultMessage: 'Inventory entities grid' }
      )}
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      rowCount={value.entities.length}
      renderCellValue={CellValue}
    />
  );
}
