/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { CellValueElementProps } from '@kbn/timelines-plugin/common';
import { StyledContent } from '../../../../common/lib/cell_actions/expanded_cell_value_actions';
import { getLinkColumnDefinition } from '../../../../common/lib/cell_actions/helpers';
import { useGetMappedNonEcsValue } from '../../../../timelines/components/timeline/body/data_driven_columns';
import { columnRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { getColumnRenderer } from '../../../../timelines/components/timeline/body/renderers/get_column_renderer';

export const PreviewRenderCellValue: React.FC<
  EuiDataGridCellValueElementProps & CellValueElementProps
> = ({
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
  scopeId,
  truncate,
}) => (
  <PreviewTableCellRenderer
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
    scopeId={scopeId}
    truncate={truncate}
  />
);

export const PreviewTableCellRenderer: React.FC<CellValueElementProps> = ({
  data,
  ecsData,
  eventId,
  header,
  isDetails,
  isDraggable,
  isTimeline,
  linkValues,
  rowRenderers,
  scopeId,
  truncate,
  key,
}) => {
  const asPlainText = useMemo(() => {
    return getLinkColumnDefinition(header.id, header.type, undefined) !== undefined && !isTimeline;
  }, [header.id, header.type, isTimeline]);

  const values = useGetMappedNonEcsValue({
    data,
    fieldName: header.id,
  });
  const styledContentClassName = isDetails
    ? 'eui-textBreakWord'
    : 'eui-displayInlineBlock eui-textTruncate';

  return (
    <>
      <StyledContent className={styledContentClassName} $isDetails={isDetails}>
        {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
          asPlainText,
          columnName: header.id,
          ecsData,
          eventId,
          field: header,
          isDetails,
          isDraggable,
          linkValues,
          rowRenderers,
          scopeId,
          truncate,
          values,
          key,
        })}
      </StyledContent>
    </>
  );
};
