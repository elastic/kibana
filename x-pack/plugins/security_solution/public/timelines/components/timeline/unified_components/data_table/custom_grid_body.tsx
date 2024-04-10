/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCustomBodyProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiTheme } from '@kbn/react-kibana-context-styled';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { RowRenderer } from '../../../../../../common/types';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';

export type RenderCustomBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
};

export const RenderCustomBody: FC<RenderCustomBodyProps> = (props) => {
  const { Cell, visibleColumns, visibleRowData, rows, enabledRowRenderers } = props;

  const visibleRows = useMemo(
    () => (rows ?? []).slice(visibleRowData.startRow, visibleRowData.endRow),
    [rows, visibleRowData]
  );

  return (
    <>
      {visibleRows.map((row, rowIndex) => (
        <RenderCustomSingleRow
          rowData={row}
          rowIndex={rowIndex}
          key={rowIndex}
          visibleColumns={visibleColumns}
          Cell={Cell}
          enabledRowRenderers={enabledRowRenderers}
        />
      ))}
    </>
  );
};

const CustomGridRow = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `euiDataGridRow ${props.className ?? ''}`,
  role: 'row',
}))`
  width: fit-content;
  border-bottom: 1px solid ${(props) => (props.theme as EuiTheme).eui.euiBorderThin};
`;

/* below styles as per : https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer */
const CustomGridRowCellWrapper = styled.div.attrs({ className: 'rowCellWrapper', role: 'row' })`
  display: flex;
`;

type RenderCustomSingleRowProps = {
  rowData: DataTableRecord & TimelineItem;
  rowIndex: number;
} & Pick<RenderCustomBodyProps, 'visibleColumns' | 'Cell' | 'enabledRowRenderers'>;

const RenderCustomSingleRow = (props: RenderCustomSingleRowProps) => {
  const { rowIndex, rowData, enabledRowRenderers, visibleColumns, Cell } = props;

  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  // removes the border between the actual row and Additional row
  // which renders the AdditionalRow
  const cellCustomStyle = useMemo(
    () =>
      canShowRowRenderer
        ? {
            borderBottom: 'none',
          }
        : {},
    [canShowRowRenderer]
  );

  return (
    <CustomGridRow
      className={`${rowIndex % 2 === 0 ? 'euiDataGridRow--striped' : ''}`}
      key={rowIndex}
    >
      <CustomGridRowCellWrapper>
        {visibleColumns.map((column, colIndex) => {
          // Skip the row details cell - we'll render it manually outside of the flex wrapper
          if (column.id !== 'additional-row-details') {
            return (
              <Cell
                style={cellCustomStyle}
                colIndex={colIndex}
                visibleRowIndex={rowIndex}
                key={`${rowIndex},${colIndex}`}
              />
            );
          }
          return null;
        })}
      </CustomGridRowCellWrapper>
      {canShowRowRenderer ? (
        <Cell
          colIndex={visibleColumns.length - 1} // If the row is being shown, it should always be the last index
          visibleRowIndex={rowIndex}
        />
      ) : null}
    </CustomGridRow>
  );
};
