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
  EuiModalBody,
  EuiModalHeader,
  EuiSpacer,
  EuiProgress,
  EuiCallOut,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { TimelineType } from '../../../../../common/types/timeline';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import { TimelineInput } from '../../../store/timeline/actions';
import { Description, Name, UpdateTitle, UpdateDescription } from '../properties/helpers';
import { TIMELINE_TITLE, DESCRIPTION, OPTIONAL } from '../properties/translations';
import { useCreateTimelineButton } from '../properties/use_create_timeline';
import * as i18n from './translations';

interface TimelineTitleAndDescriptionProps {
  showWarning?: boolean;
  timelineId: string;
  toggleSaveTimeline: () => void;
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
  ({ timelineId, toggleSaveTimeline, updateTitle, updateDescription, showWarning }) => {
    const timeline = useShallowEqualSelector((state) =>
      timelineSelectors.selectTimeline(state, timelineId)
    );

    const { description, isSaving, savedObjectId, title, timelineType } = timeline;

    const prevIsSaving = usePrevious(isSaving);
    const dispatch = useDispatch();
    const onSaveTimeline = useCallback(
      (args: TimelineInput) => dispatch(timelineActions.saveTimeline(args)),
      [dispatch]
    );

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

    useEffect(() => {
      if (!isSaving && prevIsSaving) {
        toggleSaveTimeline();
      }
    }, [isSaving, prevIsSaving, toggleSaveTimeline]);

    const modalHeader =
      savedObjectId == null
        ? timelineType === TimelineType.template
          ? i18n.SAVE_TIMELINE_TEMPLATE
          : i18n.SAVE_TIMELINE
        : timelineType === TimelineType.template
        ? i18n.NAME_TIMELINE_TEMPLATE
        : i18n.NAME_TIMELINE;

    const saveButtonTitle =
      savedObjectId == null && showWarning
        ? timelineType === TimelineType.template
          ? i18n.SAVE_TIMELINE_TEMPLATE
          : i18n.SAVE_TIMELINE
        : i18n.SAVE;

    const calloutMessage = useMemo(() => i18n.UNSAVED_TIMELINE_WARNING(timelineType), [
      timelineType,
    ]);

    const descriptionLabel = savedObjectId == null ? `${DESCRIPTION} (${OPTIONAL})` : DESCRIPTION;

    return (
      <>
        {isSaving && (
          <EuiProgress size="s" color="primary" position="absolute" data-test-subj="progress-bar" />
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
                autoFocus={true}
                disableTooltip={true}
                disableAutoSave={true}
                disabled={isSaving}
                data-test-subj="save-timeline-name"
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
            <EuiFormRow label={descriptionLabel}>
              <Description
                data-test-subj="save-timeline-description"
                description={description}
                disableTooltip={true}
                disableAutoSave={true}
                disabled={isSaving}
                timelineId={timelineId}
                updateDescription={updateDescription}
                isTextArea={true}
                marginRight={0}
              />
            </EuiFormRow>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false} component="span">
                {savedObjectId == null && showWarning ? (
                  discardTimelineButton
                ) : (
                  <EuiButton
                    fill={false}
                    onClick={toggleSaveTimeline}
                    isDisabled={isSaving}
                    data-test-subj="close-button"
                  >
                    {i18n.CLOSE_MODAL}
                  </EuiButton>
                )}
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
      </>
    );
  }
);

TimelineTitleAndDescription.displayName = 'TimelineTitleAndDescription';
