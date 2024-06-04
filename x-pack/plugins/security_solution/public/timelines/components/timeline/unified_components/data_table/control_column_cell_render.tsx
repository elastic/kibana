/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { eventIsPinned } from '../../body/helpers';
import { Actions } from '../../../../../common/components/header_actions';
import type { TimelineModel } from '../../../../store/model';
import type { ActionProps } from '../../../../../../common/types';

const noOp = () => {};
export interface UnifiedActionProps extends ActionProps {
  onToggleShowNotes: (eventId?: string) => void;
  events: TimelineItem[];
  pinnedEventIds: TimelineModel['pinnedEventIds'];
}

const ControlColumnCellRenderMemoized = memo(function RowCellRenderMemoized(
  props: UnifiedActionProps
) {
  const {
    rowIndex,
    events,
    ecsData,
    pinnedEventIds,
    onToggleShowNotes,
    eventIdToNoteIds,
    timelineId,
  } = props;
  const event = useMemo(() => events && events[rowIndex], [events, rowIndex]);
  const isPinned = useMemo(
    () => eventIsPinned({ eventId: event?._id, pinnedEventIds }),
    [event?._id, pinnedEventIds]
  );
  return (
    <Actions
      {...props}
      ariaRowindex={rowIndex}
      columnValues="columnValues"
      ecsData={ecsData ?? event.ecs}
      eventId={event?._id}
      eventIdToNoteIds={eventIdToNoteIds}
      isEventPinned={isPinned}
      isEventViewer={false}
      onEventDetailsPanelOpened={noOp}
      onRuleChange={noOp}
      showNotes={true}
      timelineId={timelineId}
      toggleShowNotes={onToggleShowNotes}
      refetch={noOp}
      rowIndex={rowIndex}
    />
  );
});

// We have to do below because during tests, Eui throws a error when processing a memoized component
// because `typeof ControlColumnCellRenderMemoized` is not a function
export const ControlColumnCellRender = (props: UnifiedActionProps) => (
  <ControlColumnCellRenderMemoized {...props} />
);
