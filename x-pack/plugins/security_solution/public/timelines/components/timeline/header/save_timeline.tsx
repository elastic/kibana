/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiOverlayMask,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineSelectors } from '../../../../timelines/store/timeline';
import {
  Description,
  Name,
  UpdateTitle,
  UpdateDescription,
  SaveTimeline,
} from '../properties/helpers';
import { NOTES_PANEL_WIDTH } from '../properties/notes_size';
import { TIMELINE_TITLE, DESCRIPTION } from '../properties/translations';
import * as i18n from './translations';

interface SaveTimelineButtonProps {
  timelineId: string;
  showOverlay: boolean;
  toolTip?: string;
  toggleSaveTimeline: () => void;
  onSaveTimeline: SaveTimeline;
  updateTitle: UpdateTitle;
  updateDescription: UpdateDescription;
}

interface TimelineTitleAndDescriptionProps {
  timelineId: string;
  toggleSaveTimeline: () => void;
  onSaveTimeline: SaveTimeline;
  updateTitle: UpdateTitle;
  updateDescription: UpdateDescription;
}

export const TimelineTitleAndDescription = React.memo<TimelineTitleAndDescriptionProps>(
  ({ timelineId, toggleSaveTimeline, onSaveTimeline, updateTitle, updateDescription }) => {
    const { savedObjectId, title, description, timelineType } = useShallowEqualSelector((state) =>
      timelineSelectors.selectTimeline(state, timelineId)
    );

    const handleClick = useCallback(() => {
      toggleSaveTimeline();
      onSaveTimeline({ id: timelineId });
    }, [toggleSaveTimeline, onSaveTimeline, timelineId]);

    return (
      <>
        <EuiModalHeader>
          {savedObjectId == null ? i18n.SAVE_TIMELINE : i18n.NAME_TIMELINE}
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFlexItem grow={true}>
            <EuiFormRow label={TIMELINE_TITLE}>
              <Name
                timelineId={timelineId}
                timelineType={timelineType}
                title={title}
                updateTitle={updateTitle}
                width="100%"
                marginRight={10}
              />
            </EuiFormRow>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFormRow label={DESCRIPTION}>
              <Description
                description={description}
                timelineId={timelineId}
                updateDescription={updateDescription}
              />
            </EuiFormRow>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false} component="span">
                <EuiButton fill={false} onClick={toggleSaveTimeline}>
                  {savedObjectId == null ? i18n.DISCARD_TIMELINE : i18n.CLOSE_SAVE_TIMELINE}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false} component="span">
                <EuiButton isDisabled={title.trim().length === 0} fill={true} onClick={handleClick}>
                  {savedObjectId == null ? i18n.SAVE_TIMELINE : i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiModalBody>
      </>
    );
  }
);

TimelineTitleAndDescription.displayName = 'TimelineTitleAndDescription';

const SaveTimelineComponent = React.memo<SaveTimelineButtonProps>(
  ({
    timelineId,
    showOverlay,
    toggleSaveTimeline,
    onSaveTimeline,
    updateTitle,
    updateDescription,
  }) => (
    <>
      <EuiButtonIcon onClick={toggleSaveTimeline} iconType="pencil">
        {timelineId == null ? i18n.SAVE_TIMELINE : i18n.UPDATE_TIMELINE}
      </EuiButtonIcon>

      {showOverlay ? (
        <EuiOverlayMask>
          <EuiModal
            data-test-subj="notesModal"
            maxWidth={NOTES_PANEL_WIDTH}
            onClose={toggleSaveTimeline}
          >
            {
              <TimelineTitleAndDescription
                timelineId={timelineId}
                toggleSaveTimeline={toggleSaveTimeline}
                onSaveTimeline={onSaveTimeline}
                updateTitle={updateTitle}
                updateDescription={updateDescription}
              />
            }
          </EuiModal>
        </EuiOverlayMask>
      ) : null}
    </>
  )
);
SaveTimelineComponent.displayName = 'SaveTimelineComponent';

export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(
  ({ toolTip, ...saveTimelineButtonProps }) =>
    saveTimelineButtonProps.showOverlay ? (
      <SaveTimelineComponent {...saveTimelineButtonProps} />
    ) : (
      <EuiToolTip content={toolTip || ''}>
        <SaveTimelineComponent {...saveTimelineButtonProps} />
      </EuiToolTip>
    )
);
SaveTimelineButton.displayName = 'SaveTimelineButton';
