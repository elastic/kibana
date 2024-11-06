/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCustomBodyProps, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { type EuiTheme } from '@kbn/react-kibana-context-styled';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { CSSProperties, FC, PropsWithChildren } from 'react';
import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { VariableSizeList } from 'react-window';
import { EuiAutoSizer, useEuiTheme } from '@elastic/eui';
import type { RowRenderer } from '../../../../../../common/types';
import { TIMELINE_EVENT_DETAIL_ROW_ID } from '../../body/constants';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';
import { getEventTypeRowClassName } from './get_event_type_row_classname';

const defaultAutoHeight: EuiDataGridRowHeightsOptions = {
  defaultHeight: 'auto',
};

export type CustomTimelineDataGridBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
  rowHeight?: number;
  refetch?: () => void;
};

const VirtualizedCustomDataGridContainer = styled.div<{
  $maxWidth?: number;
}>`
  width: 100%;
  height: 100%;
  border-bottom: ${(props) => (props.theme as EuiTheme).eui.euiBorderThin};
  .udt--customRow {
    border-radius: 0;
    padding: ${(props) => (props.theme as EuiTheme).eui.euiDataGridCellPaddingM};
    max-width: ${(props) => props.$maxWidth}px;
  }

 .euiDataGridRowCell--lastColumn.euiDataGridRowCell--controlColumn  .euiDataGridRowCell__content {
    width: ${(props) => props.$maxWidth}px;
    max-width: ${(props) => props.$maxWidth}px;
    overflow-x: auto;
    scrollbar-width: thin;
    scroll-padding: 0 0 0 0,
  }

   .euiDataGridRow:has(.unifiedDataTable__cell--expanded) {
      .euiDataGridRowCell--firstColumn,
      .euiDataGridRowCell--lastColumn,
      .euiDataGridRowCell--controlColumn,
      .udt--customRow {
        ${({ theme }) => `background-color: ${theme.eui.euiColorHighlight};`}
      }
    }
  }
`;

// THE DataGrid Row default is 34px, but we make ours 40 to account for our row actions
const DEFAULT_UDT_ROW_HEIGHT = 34;

const SCROLLBAR_STYLE: CSSProperties = {
  scrollbarWidth: 'thin',
  scrollPadding: '0 0 0 0',
  overflow: 'auto',
};

/**
 *
 * In order to render the additional row with every event ( which displays the row-renderer, notes and notes editor)
 * we need to pass a way for EuiDataGrid to render the whole grid body via a custom component
 *
 * This component is responsible for styling and accessibility of the custom designed cells.
 *
 * In our case, we need TimelineExpandedRow ( technicall a data grid column which spans the whole width of the data grid)
 * component to be shown as an addendum to the normal event row. As mentioned above, it displays the row-renderer, notes and notes editor
 *
 * Ref: https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer
 *
 * */
export const CustomTimelineDataGridBody: FC<CustomTimelineDataGridBodyProps> = memo(
  function CustomTimelineDataGridBody(props) {
    const {
      Cell,
      visibleColumns,
      visibleRowData,
      rows,
      rowHeight,
      enabledRowRenderers,
      refetch,
      setCustomGridBodyProps,
      headerRow,
      footerRow,
      gridWidth,
    } = props;

    const { euiTheme } = useEuiTheme();

    // // Set custom props onto the grid body wrapper
    const bodyRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      setCustomGridBodyProps({
        ref: bodyRef,
        style: {
          width: '100%',
          height: '100%',
          overflowY: 'hidden',
          scrollbarColor: `${euiTheme.colors.mediumShade} ${euiTheme.colors.lightestShade}`,
        },
      });
    }, [setCustomGridBodyProps, euiTheme.colors.mediumShade, euiTheme.colors.lightestShade]);

    const visibleRows = useMemo(
      () => (rows ?? []).slice(visibleRowData.startRow, visibleRowData.endRow),
      [rows, visibleRowData]
    );

    const listRef = useRef<VariableSizeList<unknown>>(null);

    const rowHeights = useRef<number[]>([]);

    const setRowHeight = useCallback((index: number, height: number) => {
      if (rowHeights.current[index] === height) return;
      listRef.current?.resetAfterIndex(index);

      rowHeights.current[index] = height;
    }, []);

    const getRowHeight = useCallback((index: number) => {
      return rowHeights.current[index] ?? 100;
    }, []);

    /*
     *
     * There is a difference between calculatedWidth & gridWidth
     *
     * gridWidth is the width of the grid as per the screen size
     *
     * calculatedWidth is the width of the grid that is calculated by EUI and represents
     * the actual width of the grid based on the content of the grid. ( Sum of the width of all columns)
     *
     * For example, screensize can be variable but calculatedWidth can be much more than that
     * with grid having a horizontal scrollbar
     *
     *
     * */
    const [calculatedWidth, setCalculatedWidth] = useState<number>(gridWidth);

    useEffect(() => {
      /*
       * Any time gridWidth(available screen size) is changed, we need to re-check
       * to see if EUI has changed the width of the grid
       *
       */
      if (!bodyRef) return;
      const headerRowRef = bodyRef?.current?.querySelector('.euiDataGridHeader[role="row"]');
      setCalculatedWidth((prev) =>
        headerRowRef?.clientWidth && headerRowRef?.clientWidth !== prev
          ? headerRowRef?.clientWidth
          : prev
      );
    }, [gridWidth]);

    const innerRowContainer = useMemo(() => {
      const InnerComp = React.forwardRef<
        HTMLDivElement,
        PropsWithChildren<{ style: CSSProperties }>
      >(({ children, style, ...rest }, ref) => {
        return (
          <>
            {headerRow}
            <div
              className="custom__grid__rows--container"
              data-test-subj="customGridRowsContainer"
              ref={ref}
              style={{ ...style, position: 'relative' }}
              {...rest}
            >
              {children}
            </div>

            {footerRow}
          </>
        );
      });

      InnerComp.displayName = 'InnerRowContainer';

      return React.memo(InnerComp);
    }, [headerRow, footerRow]);

    return (
      <VirtualizedCustomDataGridContainer $maxWidth={calculatedWidth}>
        <EuiAutoSizer className="autosizer" disableWidth>
          {({ height }) => {
            return (
              <>
                {
                  /**
                   * whenever timeline is minimized, VariableList is re-rendered which causes delay,
                   * so below code makes sure that grid is only rendered when gridWidth is not 0
                   */
                  gridWidth !== 0 && (
                    <>
                      <VariableSizeList
                        className="variable__list"
                        /* available space on the screen */
                        width={gridWidth}
                        height={height}
                        itemCount={visibleRows.length}
                        itemSize={getRowHeight}
                        overscanCount={5}
                        ref={listRef}
                        style={SCROLLBAR_STYLE}
                        innerElementType={innerRowContainer}
                      >
                        {({ index, style }) => {
                          return (
                            <div
                              role="row"
                              style={{
                                ...style,
                                width: 'fit-content',
                              }}
                              key={`${gridWidth}-${index}`}
                            >
                              <CustomDataGridSingleRow
                                rowData={visibleRows[index]}
                                rowIndex={index}
                                visibleColumns={visibleColumns}
                                Cell={Cell}
                                enabledRowRenderers={enabledRowRenderers}
                                refetch={refetch}
                                setRowHeight={setRowHeight}
                                rowHeight={rowHeight}
                              />
                            </div>
                          );
                        }}
                      </VariableSizeList>
                    </>
                  )
                }
              </>
            );
          }}
        </EuiAutoSizer>
      </VirtualizedCustomDataGridContainer>
    );
  }
);

/**
 *
 * A Simple Wrapper component for displaying a custom grid row
 * Generating CSS on this row puts a huge performance overhead on the grid as each row much styled individually.
 * If possible, try to use the styles either in ../styles.tsx or in the parent component
 *
 */

const CustomGridRow = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `euiDataGridRow ${props.className ?? ''}`,
  role: 'row',
}))``;

/* below styles as per : https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer */
const CustomGridRowCellWrapper = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `rowCellWrapper ${props.className ?? ''}`,
  role: 'row',
}))`
  height: ${(props: { $cssRowHeight: string }) => props.$cssRowHeight};
  .euiDataGridRowCell,
  .euiDataGridRowCell__content {
    min-height: ${DEFAULT_UDT_ROW_HEIGHT}px;
  }
`;

type CustomTimelineDataGridSingleRowProps = {
  rowData: DataTableRecord & TimelineItem;
  rowIndex: number;
  setRowHeight: (index: number, height: number) => void;
} & Pick<
  CustomTimelineDataGridBodyProps,
  'visibleColumns' | 'Cell' | 'enabledRowRenderers' | 'refetch' | 'rowHeight'
>;

const calculateRowHeightInPixels = (lineHeightMultiple: number): string => {
  // The line height multiple can be negative to indicate "auto" in the unified data table
  if (lineHeightMultiple < 0) return 'auto';
  // The base line-height in pixels is 16px. This would be calculated default by the datagird and we could use
  // the `configRowHeight` prop, but since we own control of our rows via `customGridBody` we have to calculate it ourselves.
  const baseRowLineHeightInPx = 16;
  const rowHeightInPixels = DEFAULT_UDT_ROW_HEIGHT + baseRowLineHeightInPx * lineHeightMultiple;
  return `${rowHeightInPixels}px`;
};

/**
 *
 * RenderCustomBody component above uses this component to display a single row.
 *
 * */
const CustomDataGridSingleRow = memo(function CustomDataGridSingleRow(
  props: CustomTimelineDataGridSingleRowProps
) {
  const {
    rowIndex,
    rowData,
    enabledRowRenderers,
    visibleColumns,
    Cell,
    rowHeight: rowHeightMultiple = 0,
    setRowHeight,
  } = props;

  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rowRef.current) {
      setRowHeight(rowIndex, rowRef.current.offsetHeight);
    }
  }, [rowIndex, setRowHeight]);

  const cssRowHeight: string = calculateRowHeightInPixels(rowHeightMultiple - 1);

  /**
   * removes the border between the actual row ( timelineEvent) and `TimelineEventDetail` row
   * which renders the row-renderer, notes and notes editor
   *
   */
  const cellCustomStyle = useMemo(
    () =>
      canShowRowRenderer
        ? {
            borderBottom: 'none',
          }
        : {},
    [canShowRowRenderer]
  );
  const eventTypeRowClassName = useMemo(() => getEventTypeRowClassName(rowData.ecs), [rowData.ecs]);

  return (
    <CustomGridRow
      className={`${rowIndex % 2 !== 0 ? 'euiDataGridRow--striped' : ''}`}
      key={rowIndex}
      ref={rowRef}
    >
      <CustomGridRowCellWrapper className={eventTypeRowClassName} $cssRowHeight={cssRowHeight}>
        {visibleColumns.map((column, colIndex) => {
          if (column.id !== TIMELINE_EVENT_DETAIL_ROW_ID) {
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

      {/* Timeline Expanded Row */}
      {canShowRowRenderer ? (
        <Cell
          rowHeightsOptions={defaultAutoHeight}
          /* @ts-expect-error because currently CellProps do not allow string width but it is important to be passed for height calculations   */
          width={'100%'}
          colIndex={visibleColumns.length - 1} // If the row is being shown, it should always be the last index
          visibleRowIndex={rowIndex}
        />
      ) : null}
    </CustomGridRow>
  );
});
