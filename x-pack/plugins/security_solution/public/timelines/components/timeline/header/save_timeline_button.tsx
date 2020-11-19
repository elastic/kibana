/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiOverlayMask, EuiModal, EuiToolTip } from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { timelineActions } from '../../../store/timeline';
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

    const dispatch = useDispatch();
    const updateTitle = useCallback(
      ({ id, title, disableAutoSave }: { id: string; title: string; disableAutoSave?: boolean }) =>
        dispatch(timelineActions.updateTitle({ id, title, disableAutoSave })),
      [dispatch]
    );

    const updateDescription = useCallback(
      ({
        id,
        description,
        disableAutoSave,
      }: {
        id: string;
        description: string;
        disableAutoSave?: boolean;
      }) => dispatch(timelineActions.updateDescription({ id, description, disableAutoSave })),
      [dispatch]
    );

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
              updateTitle={updateTitle}
              updateDescription={updateDescription}
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
