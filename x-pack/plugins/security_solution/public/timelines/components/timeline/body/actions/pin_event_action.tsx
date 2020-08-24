/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiToolTip } from '@elastic/eui';

import { EventsTd, EventsTdContent } from '../../styles';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';
import { eventHasNotes, getPinTooltip } from '../helpers';
import { Pin } from '../../pin';
import { TimelineType } from '../../../../../../common/types/timeline';

interface PinEventActionProps {
  noteIds: string[];
  onPinClicked: () => void;
  eventIsPinned: boolean;
  timelineType: TimelineType;
}

const PinEventActionComponent: React.FC<PinEventActionProps> = ({
  noteIds,
  onPinClicked,
  eventIsPinned,
  timelineType,
}) => {
  const tooltipContent = useMemo(
    () =>
      getPinTooltip({
        isPinned: eventIsPinned,
        eventHasNotes: eventHasNotes(noteIds),
        timelineType,
      }),
    [eventIsPinned, noteIds, timelineType]
  );

  return (
    <EventsTd key="timeline-action-pin-tool-tip">
      <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
        <EuiToolTip data-test-subj="timeline-action-pin-tool-tip" content={tooltipContent}>
          <Pin
            allowUnpinning={!eventHasNotes(noteIds)}
            data-test-subj="pin-event"
            onClick={onPinClicked}
            pinned={eventIsPinned}
            timelineType={timelineType}
          />
        </EuiToolTip>
      </EventsTdContent>
    </EventsTd>
  );
};

PinEventActionComponent.displayName = 'PinEventActionComponent';

export const PinEventAction = React.memo(PinEventActionComponent);
