/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React from 'react';

import { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */
export const RenderCellValue: React.FC<
  EuiDataGridCellValueElementProps & CellValueElementProps
> = ({
  browserFields,
  columnId,
  data,
  ecsData,
  eventId,
  globalFilters,
  header,
  isDetails,
  isDraggable,
  isExpandable,
  isExpanded,
  linkValues,
  rowIndex,
  colIndex,
  rowRenderers,
  setCellProps,
  timelineId,
  truncate,
}) => (
  <DefaultCellRenderer
    browserFields={browserFields}
    columnId={columnId}
    data={data}
    ecsData={ecsData}
    eventId={eventId}
    globalFilters={globalFilters}
    header={header}
    isDetails={isDetails}
    isDraggable={isDraggable}
    isExpandable={isExpandable}
    isExpanded={isExpanded}
    linkValues={linkValues}
    rowIndex={rowIndex}
    colIndex={colIndex}
    rowRenderers={rowRenderers}
    setCellProps={setCellProps}
    timelineId={timelineId}
    truncate={truncate}
  />
);
