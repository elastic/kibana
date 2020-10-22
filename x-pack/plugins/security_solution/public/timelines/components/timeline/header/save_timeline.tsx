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
  EuiProgress,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { TimelineType } from '../../../../../common/types/timeline';
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
import { useCreateTimelineButton } from '../properties/use_create_timeline';
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

const Wrapper = styled(EuiModalBody)`
  .euiFormRow {
    max-width: none;
  }

  .euiFormControlLayout {
    max-width: none;
  }

  .euiFieldText {
    max-width: none;
  }
`;

Wrapper.displayName = 'Wrapper';

export const TimelineTitleAndDescription = React.memo<TimelineTitleAndDescriptionProps>(
  ({ timelineId, toggleSaveTimeline, onSaveTimeline, updateTitle, updateDescription }) => {
    const timeline = useShallowEqualSelector((state) =>
      timelineSelectors.selectTimeline(state, timelineId)
    );

    const { description, isSaving, savedObjectId, title, timelineType } = timeline;

    const handleClick = useCallback(() => {
      onSaveTimeline({
        ...timeline,
        id: timelineId,
      });
    }, [onSaveTimeline, timeline, timelineId]);

    const { getButton } = useCreateTimelineButton({ timelineId, timelineType });

    const discardTimelineButton = useMemo(
      () =>
        getButton({
          title:
            timelineType === TimelineType.template
              ? i18n.DISCARD_TIMELINE_TEMPLATE
              : i18n.DISCARD_TIMELINE,
          outline: true,
          iconType: '',
          fill: false,
        }),
      [getButton, timelineType]
    );

    const modalHeader =
      savedObjectId == null
        ? timelineType === TimelineType.template
          ? i18n.SAVE_TIMELINE_TEMPLATE
          : i18n.SAVE_TIMELINE
        : timelineType === TimelineType.template
        ? i18n.NAME_TIMELINE_TEMPLATE
        : i18n.NAME_TIMELINE;

    const saveButtonTitle =
      savedObjectId == null
        ? timelineType === TimelineType.template
          ? i18n.SAVE_TIMELINE_TEMPLATE
          : i18n.SAVE_TIMELINE
        : i18n.SAVE;

    return (
      <>
        {isSaving && (
          <EuiProgress size="s" color="primary" position="absolute" data-test-subj="progress-bar" />
        )}
        <EuiModalHeader data-test-subj="modal-header">{modalHeader}</EuiModalHeader>

        <Wrapper>
          <EuiFlexItem grow={true}>
            <EuiFormRow label={TIMELINE_TITLE}>
              <Name
                timelineId={timelineId}
                timelineType={timelineType}
                title={title}
                updateTitle={updateTitle}
                width="100%"
                marginRight={10}
                disableAutoSave={true}
                data-test-subj="save-timeline-name"
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
                isTextArea={true}
                disableAutoSave={true}
                marginRight={0}
                data-test-subj="save-timeline-description"
              />
            </EuiFormRow>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false} component="span">
                {savedObjectId == null ? (
                  discardTimelineButton
                ) : (
                  <EuiButton fill={false} onClick={toggleSaveTimeline}>
                    {i18n.CLOSE_MODAL}
                  </EuiButton>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false} component="span">
                <EuiButton
                  isDisabled={title.trim().length === 0}
                  fill={true}
                  onClick={handleClick}
                  data-test-subj="save-button"
                >
                  {saveButtonTitle}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </Wrapper>
      </>
    );
  }
);

TimelineTitleAndDescription.displayName = 'TimelineTitleAndDescription';

export const SaveTimelineComponent = React.memo<SaveTimelineButtonProps>(
  ({
    timelineId,
    showOverlay,
    toggleSaveTimeline,
    onSaveTimeline,
    updateTitle,
    updateDescription,
  }) => (
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
              onSaveTimeline={onSaveTimeline}
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

export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(
  ({ toolTip, ...saveTimelineButtonProps }) =>
    saveTimelineButtonProps.showOverlay ? (
      <SaveTimelineComponent {...saveTimelineButtonProps} />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="save-timeline-btn-tooltip">
        <SaveTimelineComponent {...saveTimelineButtonProps} />
      </EuiToolTip>
    )
);
SaveTimelineButton.displayName = 'SaveTimelineButton';
