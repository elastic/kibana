/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, memo, useEffect, useContext } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiDataGridSetCellProps, EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';
import { EventsTrSupplement } from '../../styles';
import { StatefulRowRenderer } from '../../body/events/stateful_row_renderer';
import type { RowRenderer } from '../../../../../../common/types';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

type RenderCellValueProps = EuiDataGridCellValueElementProps;

type AdditionalRowProps = {
  rowIndex: number;
  event: TimelineItem;
  setCellProps?: (props: EuiDataGridSetCellProps) => void;
  timelineId: string;
  enabledRowRenderers: RowRenderer[];
} & RenderCellValueProps;

export const AdditionalRowComp: React.FC<AdditionalRowProps> = memo(
  ({ rowIndex, event, setCellProps, timelineId, enabledRowRenderers, isExpanded }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const ctx = useContext(UnifiedDataTableContext);

    useEffect(() => {
      setCellProps?.({
        className: ctx.expanded?.id === event._id ? 'unifiedDataTable__cell--expanded' : '',
        style: { width: '100%', height: 'auto' },
      });
    }, [ctx.expanded?.id, setCellProps, rowIndex, event._id]);

    return (
      <>
        {enabledRowRenderers.length > 0 ? (
          <EuiFlexGroup gutterSize="none" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EventsTrSupplement>
                <StatefulRowRenderer
                  ariaRowindex={rowIndex + ARIA_ROW_INDEX_OFFSET}
                  containerRef={containerRef}
                  event={event}
                  lastFocusedAriaColindex={rowIndex - 1}
                  rowRenderers={enabledRowRenderers}
                  timelineId={timelineId}
                />
              </EventsTrSupplement>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
      </>
    );
  }
);
AdditionalRowComp.displayName = 'AdditionalRowComp';

export const AdditionalRow = React.memo(AdditionalRowComp);
// eslint-disable-next-line import/no-default-export
export { AdditionalRow as default };
