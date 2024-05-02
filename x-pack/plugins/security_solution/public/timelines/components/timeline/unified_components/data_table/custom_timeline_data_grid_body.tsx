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
import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import type { RowRenderer } from '../../../../../../common/types';
import { TIMELINE_EVENT_DETAIL_ROW_ID } from '../../body/constants';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';
import { UNIFIED_TIMELINE_CONFIG } from '../utils';
import { useGetEventTypeRowClassName } from './use_get_event_type_row_classname';

const IS_ROW_RENDERER_LAZY_LOADING_ENABLED = true;

export type CustomTimelineDataGridBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
  rowHeight?: number;
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
    const { Cell, visibleColumns, visibleRowData, rows, enabledRowRenderers } = props;

    const visibleRows = useMemo(
      () => (rows ?? []).slice(visibleRowData.startRow, visibleRowData.endRow),
      [rows, visibleRowData]
    );

    return (
      <>
        {visibleRows.map((row, rowIndex) => {
          return (
            <CustomDataGridSingleRow
              rowData={row}
              rowIndex={rowIndex}
              key={rowIndex}
              visibleColumns={visibleColumns}
              Cell={Cell}
              enabledRowRenderers={enabledRowRenderers}
              rowHeight={props.rowHeight}
            />
          );
        })}
      </>
    );
  }
);

/**
 *
 * A Simple Wrapper component for displaying a custom grid row
 *
 */
const CustomGridRow = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `unifiedTimeline__dataGridRow euiDataGridRow ${props.className ?? ''}`,
  role: 'row',
}))<{
  isRowLoading$: boolean;
}>`
  ${(props) => (props.isRowLoading$ ? 'width: 100%;' : 'width: fit-content;')}
  border-bottom: 1px solid ${(props) => (props.theme as EuiTheme).eui.euiBorderThin};
`;

const CustomLazyRowPlaceholder = styled.div.attrs({
  className: 'customlazyGridRowPlaceholder',
})<{
  rowHeight: number;
}>`
  width: 100%;
  ${(props) =>
    props.rowHeight === -1
      ? `height: ${UNIFIED_TIMELINE_CONFIG.DEFAULT_TIMELINE_ROW_HEIGHT_WITH_EVENT_DETAIL_ROW};`
      : `height: ${
          UNIFIED_TIMELINE_CONFIG.DEFAULT_TIMELINE_ROW_HEIGHT_WITH_EVENT_DETAIL_ROW +
          props.rowHeight * UNIFIED_TIMELINE_CONFIG.DEFAULT_TIMELINE_ROW_HEIGHT
        }px;`};
`;

/**
 *
 * A Simple Wrapper component for displaying a custom data grid `cell`
 */
const CustomGridRowCellWrapper = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `rowCellWrapper ${props.className ?? ''}`,
}))`
  display: flex;
`;

type CustomTimelineDataGridSingleRowProps = {
  rowData: DataTableRecord & TimelineItem;
  rowIndex: number;
  rowHeight?: number;
} & Pick<CustomTimelineDataGridBodyProps, 'visibleColumns' | 'Cell' | 'enabledRowRenderers'>;

/**
 *
 * RenderCustomBody component above uses this component to display a single row.
 *
 * */
const CustomDataGridSingleRow = memo(function CustomDataGridSingleRow(
  props: CustomTimelineDataGridSingleRowProps
) {
  const { rowIndex, rowData, enabledRowRenderers, visibleColumns, Cell, rowHeight = -1 } = props;

  const [intersectionEntry, setIntersectionEntry] = useState<IntersectionObserverEntry>({
    isIntersecting: rowIndex < UNIFIED_TIMELINE_CONFIG.DEFAULT_PRELOADED_ROWS + 1 ? true : false,
    intersectionRatio: rowIndex < UNIFIED_TIMELINE_CONFIG.DEFAULT_PRELOADED_ROWS + 1 ? 1 : 0,
  } as IntersectionObserverEntry);

  const intersectionRef = useRef<HTMLDivElement | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);

  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  const onIntersectionChange = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      setIntersectionEntry(entry);
    });
  }, []);

  useEffect(() => {
    if (intersectionRef.current && !observer.current) {
      observer.current = new IntersectionObserver(onIntersectionChange, {
        rootMargin: '250px',
      });

      observer.current.observe(intersectionRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [onIntersectionChange]);

  const eventTypeRowClassName = useGetEventTypeRowClassName(rowData.ecs);

  const isRowIntersecting =
    intersectionEntry.isIntersecting && intersectionEntry.intersectionRatio > 0;

  const isRowLoading =
    UNIFIED_TIMELINE_CONFIG.IS_CUSTOM_TIMELINE_DATA_GRID_ROW_LAZY_LOADING_ENABLED &&
    !isRowIntersecting;

  return (
    <CustomGridRow
      className={`${rowIndex % 2 === 0 && !isRowLoading ? 'euiDataGridRow--striped' : ''}`}
      isRowLoading$={isRowLoading}
      key={rowIndex}
      ref={intersectionRef}
    >
      {isRowLoading ? (
        <CustomLazyRowPlaceholder rowHeight={rowHeight} />
      ) : (
        <>
          <CustomGridRowCellWrapper className={eventTypeRowClassName}>
            {visibleColumns.map((column, colIndex) => {
              return (
                <React.Fragment key={`${rowIndex}-${colIndex}`}>
                  {
                    // Skip the expanded row cell - we'll render it manually outside of the flex wrapper
                    column.id !== TIMELINE_EVENT_DETAIL_ROW_ID ? (
                      <Cell colIndex={colIndex} visibleRowIndex={rowIndex} />
                    ) : null
                  }
                </React.Fragment>
              );
            })}
          </CustomGridRowCellWrapper>
          {/* Timeline Event Detail Row Renderer */}
          {canShowRowRenderer ? (
            <Cell
              colIndex={visibleColumns.length - 1} // If the row is being shown, it should always be the last index
              visibleRowIndex={rowIndex}
            />
          ) : null}
        </>
      )}
    </CustomGridRow>
  );
});
