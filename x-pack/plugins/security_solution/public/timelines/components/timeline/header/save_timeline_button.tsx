/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { TimelineTitleAndDescription } from './title_and_description';
import { EDIT } from './translations';

export interface SaveTimelineComponentProps {
  initialFocus: 'title' | 'description';
  timelineId: string;
  toolTip?: string;
}

export const SaveTimelineButton = React.memo<SaveTimelineComponentProps>(
  ({ initialFocus, timelineId, toolTip }) => {
    const [showSaveTimelineOverlay, setShowSaveTimelineOverlay] = useState<boolean>(false);
    const onToggleSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay((prevShowSaveTimelineOverlay) => !prevShowSaveTimelineOverlay);
    }, [setShowSaveTimelineOverlay]);

    const saveTimelineButtonIcon = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={EDIT}
          onClick={onToggleSaveTimeline}
          iconType="pencil"
          data-test-subj="save-timeline-button-icon"
        />
      ),
      [onToggleSaveTimeline]
    );

    return showSaveTimelineOverlay ? (
      <>
        {saveTimelineButtonIcon}
        <TimelineTitleAndDescription
          initialFocus={initialFocus}
          timelineId={timelineId}
          toggleSaveTimeline={onToggleSaveTimeline}
        />
      </>
    ) : (
      <EuiToolTip content={toolTip ?? ''} data-test-subj="save-timeline-btn-tooltip">
        {saveTimelineButtonIcon}
      </EuiToolTip>
    );
  }
);

SaveTimelineButton.displayName = 'SaveTimelineButton';
