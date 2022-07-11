/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React from 'react';
import { TimelineId } from '../../../../common/types';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

import type { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
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

export const useRenderCellValue = ({
  setFlyoutAlert,
}: {
  setFlyoutAlert?: (data: never) => void;
}) => {
  const { browserFields } = useSourcererDataView(SourcererScopeName.detections);
  return ({
    columnId,
    colIndex,
    data,
    ecsData,
    eventId,
    globalFilters,
    header,
    isDetails = false,
    isDraggable = false,
    isExpandable,
    isExpanded,
    linkValues,
    rowIndex,
    rowRenderers,
    setCellProps,
    truncate = true,
  }: CellValueElementProps) => {
    const splitColumnId = columnId.split('.');
    let myHeader = header ?? { id: columnId };
    if (splitColumnId.length > 1 && browserFields[splitColumnId[0]]) {
      const attr = (browserFields[splitColumnId[0]].fields ?? {})[columnId] ?? {};
      myHeader = { ...myHeader, ...attr };
    } else if (splitColumnId.length === 1) {
      const attr = (browserFields.base.fields ?? {})[columnId] ?? {};
      myHeader = { ...myHeader, ...attr };
    }

    return (
      <DefaultCellRenderer
        browserFields={browserFields}
        columnId={columnId}
        data={data}
        ecsData={ecsData}
        eventId={eventId}
        globalFilters={globalFilters}
        header={myHeader}
        isDetails={isDetails}
        isDraggable={isDraggable}
        isExpandable={isExpandable}
        isExpanded={isExpanded}
        linkValues={linkValues}
        rowIndex={rowIndex}
        colIndex={colIndex}
        rowRenderers={rowRenderers}
        setCellProps={setCellProps}
        timelineId={TimelineId.casePage}
        truncate={truncate}
      />
    );
  };
};
