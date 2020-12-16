/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiSpacer,
  EuiProgress,
  EuiCallOut,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { TimelineId, TimelineStatus, TimelineType } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import { TimelineInput } from '../../../store/timeline/actions';
import { Description, Name } from '../properties/helpers';
import { NOTES_PANEL_WIDTH } from '../properties/notes_size';
import { TIMELINE_TITLE, DESCRIPTION, OPTIONAL } from '../properties/translations';
import { useCreateTimeline } from '../properties/use_create_timeline';
import * as i18n from './translations';

interface TimelineTitleAndDescriptionProps {
  closeSaveTimeline: () => void;
  initialFocus: 'title' | 'description';
  openSaveTimeline: () => void;
  timelineId: string;
  showWarning?: boolean;
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

const usePrevious = (value: unknown) => {
  const ref = useRef<unknown>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

// when showWarning equals to true,
// the modal is used as a reminder for users to save / discard
// the unsaved timeline / template
export const TimelineTitleAndDescription = React.memo<TimelineTitleAndDescriptionProps>(
  ({ closeSaveTimeline, initialFocus, openSaveTimeline, timelineId, showWarning }) => {
    // TODO: Refactor to use useForm() instead
    const [isFormSubmitted, setFormSubmitted] = useState(false);
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timeline = useDeepEqualSelector((state) => getTimeline(state, timelineId));
    const { isSaving, status, title, timelineType } = timeline;
    const prevIsSaving = usePrevious(isSaving);
    const dispatch = useDispatch();
    const handleCreateNewTimeline = useCreateTimeline({
      timelineId: TimelineId.active,
      timelineType: TimelineType.default,
    });
    const onSaveTimeline = useCallback(
      (args: TimelineInput) => dispatch(timelineActions.saveTimeline(args)),
      [dispatch]
    );

    const handleClick = useCallback(() => {
      // TODO: Refactor action to take only title and description as params not the whole timeline
      onSaveTimeline({
        ...timeline,
        id: timelineId,
      });
      setFormSubmitted(true);
    }, [onSaveTimeline, timeline, timelineId]);

    const handleCancel = useCallback(() => {
      if (showWarning) {
        handleCreateNewTimeline();
      }
      closeSaveTimeline();
    }, [closeSaveTimeline, handleCreateNewTimeline, showWarning]);

    const closeModalText = useMemo(() => {
      if (status === TimelineStatus.draft && showWarning) {
        return timelineType === TimelineType.template
          ? i18n.DISCARD_TIMELINE_TEMPLATE
          : i18n.DISCARD_TIMELINE;
      }
      return i18n.CLOSE_MODAL;
    }, [showWarning, status, timelineType]);

    useEffect(() => {
      if (isFormSubmitted && !isSaving && prevIsSaving) {
        closeSaveTimeline();
      }
    }, [isFormSubmitted, isSaving, prevIsSaving, closeSaveTimeline]);

    const modalHeader =
      status === TimelineStatus.draft
        ? timelineType === TimelineType.template
          ? i18n.SAVE_TIMELINE_TEMPLATE
          : i18n.SAVE_TIMELINE
        : timelineType === TimelineType.template
        ? i18n.NAME_TIMELINE_TEMPLATE
        : i18n.NAME_TIMELINE;

    const saveButtonTitle =
      status === TimelineStatus.draft && showWarning
        ? timelineType === TimelineType.template
          ? i18n.SAVE_TIMELINE_TEMPLATE
          : i18n.SAVE_TIMELINE
        : i18n.SAVE;

    const calloutMessage = useMemo(() => i18n.UNSAVED_TIMELINE_WARNING(timelineType), [
      timelineType,
    ]);

    const descriptionLabel =
      status === TimelineStatus.draft ? `${DESCRIPTION} (${OPTIONAL})` : DESCRIPTION;

    return (
      <EuiOverlayMask>
        <EuiModal
          data-test-subj="save-timeline-modal"
          maxWidth={NOTES_PANEL_WIDTH}
          onClose={closeSaveTimeline}
        >
          {isSaving && (
            <EuiProgress
              size="s"
              color="primary"
              position="absolute"
              data-test-subj="progress-bar"
            />
          )}
          <EuiModalHeader data-test-subj="modal-header">{modalHeader}</EuiModalHeader>

          <Wrapper>
            {showWarning && (
              <EuiFlexItem grow={true}>
                <EuiCallOut
                  title={calloutMessage}
                  color="danger"
                  iconType="alert"
                  data-test-subj="save-timeline-callout"
                />
                <EuiSpacer size="m" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={true}>
              <EuiFormRow label={TIMELINE_TITLE}>
                <Name
                  autoFocus={initialFocus === 'title'}
                  disableTooltip={true}
                  disableAutoSave={true}
                  disabled={isSaving}
                  data-test-subj="save-timeline-name"
                  timelineId={timelineId}
                />
              </EuiFormRow>
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiFormRow label={descriptionLabel}>
                <Description
                  autoFocus={initialFocus === 'description'}
                  data-test-subj="save-timeline-description"
                  disableTooltip={true}
                  disableAutoSave={true}
                  disabled={isSaving}
                  timelineId={timelineId}
                />
              </EuiFormRow>
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false} component="span">
                  <EuiButton
                    fill={false}
                    onClick={handleCancel}
                    isDisabled={isSaving}
                    data-test-subj="close-button"
                  >
                    {closeModalText}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false} component="span">
                  <EuiButton
                    isDisabled={title.trim().length === 0 || isSaving}
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
        </EuiModal>
      </EuiOverlayMask>
    );
  }
);

TimelineTitleAndDescription.displayName = 'TimelineTitleAndDescription';
