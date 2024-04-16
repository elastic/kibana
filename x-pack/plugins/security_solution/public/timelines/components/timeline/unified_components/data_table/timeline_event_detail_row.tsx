/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, memo, useEffect } from 'react';

import type { EuiDataGridSetCellProps, EuiDataGridCellValueElementProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { EventsTrSupplement } from '../../styles';
import { StatefulRowRenderer } from '../../body/events/stateful_row_renderer';
import type { RowRenderer } from '../../../../../../common/types';
import { useTimelineUnifiedDataTableContext } from './use_timeline_unified_data_table_context';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

type RenderCellValueProps = EuiDataGridCellValueElementProps;

export interface TimelineEventDetailRowOwnProps {
  rowIndex: number;
  event: TimelineItem;
  setCellProps?: (props: EuiDataGridSetCellProps) => void;
  timelineId: string;
  enabledRowRenderers: RowRenderer[];
}

export type TimelineEventDetailRowProps = RenderCellValueProps & TimelineEventDetailRowOwnProps;

/**
 * Renders the additional row for the timeline
 * This additional row is used to render:
 * - the row renderers
 * - the notes and text area when notes are being created.
 *
 * This components is also responsible for styling that additional row when
 * a event/alert is expanded (i.e. when flyout is open and user is viewing the details of the event)
 *
 * */
export const TimelineEventDetailRow: React.FC<TimelineEventDetailRowProps> = memo(
  function TimelineEventDetailRow({
    rowIndex,
    event,
    setCellProps,
    timelineId,
    enabledRowRenderers,
  }) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    /*
     * Ideally, unified data table could have handled the styling of trailing columns when a row is expanded.
     * But, a trailing column can have arbitrary design and that is why it is best for consumer to handle the styling
     * as we are doing below
     *
     * */
    const ctx = useTimelineUnifiedDataTableContext();

    useEffect(() => {
      setCellProps?.({
        className: ctx.expanded?.id === event._id ? 'unifiedDataTable__cell--expanded' : '',
        style: { width: '100%', height: 'auto' },
      });
    }, [ctx.expanded?.id, setCellProps, rowIndex, event._id]);

    if (!enabledRowRenderers || enabledRowRenderers.length === 0) return null;

    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        data-test-subj={`timeline-row-renderer-${rowIndex}`}
      >
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
    );
  }
);
