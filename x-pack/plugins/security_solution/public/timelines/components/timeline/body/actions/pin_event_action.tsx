/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiToolTip } from '@elastic/eui';

import { DEFAULT_ACTION_BUTTON_WIDTH } from '@kbn/timelines-plugin/public';
import { EventsTdContent } from '../../styles';
import { eventHasNotes, getPinTooltip } from '../helpers';
import { Pin } from '../../pin';
import { TimelineType } from '../../../../../../common/types/timeline';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

interface PinEventActionProps {
  ariaLabel?: string;
  isAlert: boolean;
  noteIds: string[];
  onPinClicked: () => void;
  eventIsPinned: boolean;
  timelineType: TimelineType;
}

const PinEventActionComponent: React.FC<PinEventActionProps> = ({
  ariaLabel,
  isAlert,
  noteIds,
  onPinClicked,
  eventIsPinned,
  timelineType,
}) => {
  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();
  const tooltipContent = useMemo(
    () =>
      getPinTooltip({
        isPinned: eventIsPinned,
        isAlert,
        eventHasNotes: eventHasNotes(noteIds),
        timelineType,
      }),
    [eventIsPinned, isAlert, noteIds, timelineType]
  );

  return (
    <div key="timeline-action-pin-tool-tip">
      <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
        <EuiToolTip data-test-subj="timeline-action-pin-tool-tip" content={tooltipContent}>
          <Pin
            ariaLabel={ariaLabel}
            allowUnpinning={!eventHasNotes(noteIds)}
            data-test-subj="pin-event"
            isDisabled={kibanaSecuritySolutionsPrivileges.crud === false}
            isAlert={isAlert}
            onClick={onPinClicked}
            pinned={eventIsPinned}
            timelineType={timelineType}
          />
        </EuiToolTip>
      </EventsTdContent>
    </div>
  );
};

PinEventActionComponent.displayName = 'PinEventActionComponent';

export const PinEventAction = React.memo(PinEventActionComponent);
