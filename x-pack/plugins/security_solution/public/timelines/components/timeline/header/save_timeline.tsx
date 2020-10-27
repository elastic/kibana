/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiModal, EuiOverlayMask } from '@elastic/eui';
import React from 'react';
import { UpdateTitle, UpdateDescription } from '../properties/helpers';
import { NOTES_PANEL_WIDTH } from '../properties/notes_size';

import { TimelineTitleAndDescription } from './title_and_description';

export interface SaveTimelineComponentProps {
  timelineId: string;
  showOverlay: boolean;
  toolTip?: string;
  toggleSaveTimeline: () => void;
  updateTitle: UpdateTitle;
  updateDescription: UpdateDescription;
}

export const SaveTimelineComponent = React.memo<SaveTimelineComponentProps>(
  ({ timelineId, showOverlay, toggleSaveTimeline, updateTitle, updateDescription }) => (
    <>
      <EuiButtonIcon
        onClick={toggleSaveTimeline}
        iconType="pencil"
        data-test-subj="save-timeline-button-icon"
      />

      {showOverlay ? (
        <EuiOverlayMask>
          <EuiModal
            data-test-subj="save-timeline-modal"
            maxWidth={NOTES_PANEL_WIDTH}
            onClose={toggleSaveTimeline}
          >
            <TimelineTitleAndDescription
              timelineId={timelineId}
              toggleSaveTimeline={toggleSaveTimeline}
              updateTitle={updateTitle}
              updateDescription={updateDescription}
            />
          </EuiModal>
        </EuiOverlayMask>
      ) : null}
    </>
  )
);
SaveTimelineComponent.displayName = 'SaveTimelineComponent';
