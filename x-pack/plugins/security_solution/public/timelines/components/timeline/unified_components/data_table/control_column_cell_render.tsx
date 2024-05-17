/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import React, { memo, useMemo } from 'react';
import { TimelineId } from '../../../../../../common/types';
import type { ActionProps } from '../../../../../../common/types';
import { Actions } from '../../../../../common/components/header_actions';
import type { TimelineModel } from '../../../../store/model';
import { eventIsPinned } from '../../body/helpers';

const noOp = () => {};
const emptyLoadingEventIds: string[] = [];
export interface UnifiedActionProps extends ActionProps {
  onToggleShowNotes: (eventId?: string) => void;
  events: TimelineItem[];
  pinnedEventIds: TimelineModel['pinnedEventIds'];
}

export const ControlColumnCellRender = memo(function RowCellRender(props: UnifiedActionProps) {
  const { rowIndex, events, ecsData, pinnedEventIds, onToggleShowNotes, eventIdToNoteIds } = props;
  const event = useMemo(() => events && events[rowIndex], [events, rowIndex]);
  const isPinned = useMemo(
    () => eventIsPinned({ eventId: event?._id, pinnedEventIds }),
    [event?._id, pinnedEventIds]
  );
  return (
    <Actions
      {...props}
      ecsData={ecsData ?? event.ecs}
      ariaRowindex={rowIndex}
      rowIndex={rowIndex}
      checked={false}
      columnValues="columnValues"
      eventId={event?._id}
      eventIdToNoteIds={eventIdToNoteIds}
      isEventPinned={isPinned}
      isEventViewer={false}
      loadingEventIds={emptyLoadingEventIds}
      onEventDetailsPanelOpened={noOp}
      onRowSelected={noOp}
      onRuleChange={noOp}
      showCheckboxes={false}
      showNotes={true}
      timelineId={TimelineId.active}
      toggleShowNotes={onToggleShowNotes}
      refetch={noOp}
    />
  );
});
