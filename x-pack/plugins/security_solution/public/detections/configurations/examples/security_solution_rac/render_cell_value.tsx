/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React from 'react';

import { DefaultDraggable } from '../../../../common/components/draggables';
import { TruncatableText } from '../../../../common/components/truncatable_text';
import { Severity } from '../../../components/severity';
import { getMappedNonEcsValue } from '../../../../timelines/components/timeline/body/data_driven_columns';
import { CellValueElementProps } from '../../../../timelines/components/timeline/cell_rendering';
import { DefaultCellRenderer } from '../../../../timelines/components/timeline/cell_rendering/default_cell_renderer';

const reason =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */
export const RenderCellValue: React.FC<
  EuiDataGridCellValueElementProps & CellValueElementProps
> = ({
  columnId,
  data,
  eventId,
  header,
  isDetails,
  isExpandable,
  isExpanded,
  linkValues,
  rowIndex,
  setCellProps,
  timelineId,
}) => {
  const value =
    getMappedNonEcsValue({
      data,
      fieldName: columnId,
    })?.reduce((x) => x[0]) ?? '';
  const draggableId = `${timelineId}-${eventId}-${columnId}-${value}`;

  switch (columnId) {
    case 'signal.rule.severity':
      return (
        <DefaultDraggable
          data-test-subj="custom-severity"
          field={columnId}
          id={draggableId}
          value={value}
        >
          <Severity severity={value} />
        </DefaultDraggable>
      );
    case 'signal.reason':
      return <TruncatableText data-test-subj="custom-reason">{reason}</TruncatableText>;
    default:
      return (
        <DefaultCellRenderer
          columnId={columnId}
          data={data}
          eventId={eventId}
          header={header}
          isDetails={isDetails}
          isExpandable={isExpandable}
          isExpanded={isExpanded}
          linkValues={linkValues}
          rowIndex={rowIndex}
          setCellProps={setCellProps}
          timelineId={timelineId}
        />
      );
  }
};
