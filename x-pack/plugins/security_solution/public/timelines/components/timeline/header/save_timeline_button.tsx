/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiOverlayMask, EuiModal, EuiToolTip } from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { NOTES_PANEL_WIDTH } from '../properties/notes_size';

import { TimelineTitleAndDescription } from './title_and_description';
import { EDIT } from './translations';

export interface SaveTimelineComponentProps {
  timelineId: string;
  toolTip?: string;
}

export const SaveTimelineButton = React.memo<SaveTimelineComponentProps>(
  ({ timelineId, toolTip }) => {
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
        <EuiOverlayMask>
          <EuiModal
            data-test-subj="save-timeline-modal"
            maxWidth={NOTES_PANEL_WIDTH}
            onClose={onToggleSaveTimeline}
          >
            <TimelineTitleAndDescription
              timelineId={timelineId}
              toggleSaveTimeline={onToggleSaveTimeline}
            />
          </EuiModal>
        </EuiOverlayMask>
      </>
    ) : (
      <EuiToolTip content={toolTip ?? ''} data-test-subj="save-timeline-btn-tooltip">
        {saveTimelineButtonIcon}
      </EuiToolTip>
    );
  }
);

SaveTimelineButton.displayName = 'SaveTimelineButton';
