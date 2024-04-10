/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, memo, useEffect } from 'react';

import type { EuiDataGridSetCellProps, EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { EventsTrSupplement } from '../../styles';
import { StatefulRowRenderer } from '../../body/events/stateful_row_renderer';
import type { RowRenderer } from '../../../../../../common/types';
import { useTimelineUnifiedDataTableContext } from './use_timeline_unified_data_table_context';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

type RenderCellValueProps = EuiDataGridCellValueElementProps;

export interface AdditionalRowOwnProps {
  rowIndex: number;
  event: TimelineItem;
  setCellProps?: (props: EuiDataGridSetCellProps) => void;
  timelineId: string;
  enabledRowRenderers: RowRenderer[];
}

export type AdditionalRowProps = RenderCellValueProps & AdditionalRowOwnProps;

const AdditionalRowComp: React.FC<AdditionalRowProps> = memo(
  ({ rowIndex, event, setCellProps, timelineId, enabledRowRenderers }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // as of now eui does not update trailing column cell props when the row is expanded
    // so we need to use the UnifiedDataTableContext to determine if the row is expanded
    const ctx = useTimelineUnifiedDataTableContext();

    useEffect(() => {
      setCellProps?.({
        className: ctx.expanded?.id === event._id ? 'unifiedDataTable__cell--expanded' : '',
        style: { width: '100%', height: 'auto' },
      });
    }, [ctx.expanded?.id, setCellProps, rowIndex, event._id]);

    if (!enabledRowRenderers || enabledRowRenderers.length === 0) return null;

    return (
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
    );
  }
);
AdditionalRowComp.displayName = 'AdditionalRowComp';

export const AdditionalRow = React.memo(AdditionalRowComp);
// eslint-disable-next-line import/no-default-export
export { AdditionalRow as default };
