/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiSpacer,
  EuiProgress,
  EuiCallOut,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';

import { getUseField, Field, Form, useForm } from '../../../../shared_imports';
import { TimelineId, TimelineStatus, TimelineType } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { NOTES_PANEL_WIDTH } from '../properties/notes_size';
import { useCreateTimeline } from '../properties/use_create_timeline';
import * as commonI18n from '../properties/translations';
import * as i18n from './translations';
import { formSchema } from './schema';

const CommonUseField = getUseField({ component: Field });
interface TimelineTitleAndDescriptionProps {
  closeSaveTimeline: () => void;
  initialFocus: 'title' | 'description';
  timelineId: string;
  showWarning?: boolean;
}

// when showWarning equals to true,
// the modal is used as a reminder for users to save / discard
// the unsaved timeline / template
export const TimelineTitleAndDescription = React.memo<TimelineTitleAndDescriptionProps>(
  ({ closeSaveTimeline, initialFocus, timelineId, showWarning }) => {
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const {
      isSaving,
      description = '',
      status,
      title = '',
      timelineType,
    } = useDeepEqualSelector((state) =>
      pick(
        ['isSaving', 'description', 'status', 'title', 'timelineType'],
        getTimeline(state, timelineId)
      )
    );
    const prevIsSaving = usePrevious(isSaving);
    const dispatch = useDispatch();
    const handleCreateNewTimeline = useCreateTimeline({
      timelineId: TimelineId.active,
      timelineType: TimelineType.default,
    });

    const handleSubmit = useCallback(
      (titleAndDescription, isValid) => {
        if (isValid) {
          dispatch(
            timelineActions.updateTitleAndDescription({
              id: timelineId,
              ...titleAndDescription,
            })
          );
        }

        return Promise.resolve();
      },
      [dispatch, timelineId]
    );

    const initialState = useMemo(
      () => ({
        title,
        description,
      }),
      [title, description]
    );

    const { form } = useForm({
      id: 'timelineTitleAndDescriptionForm',
      schema: formSchema,
      onSubmit: handleSubmit,
      options: {
        stripEmptyFields: false,
      },
      defaultValue: initialState,
    });
    const { isSubmitted, isSubmitting, submit } = form;

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

    const modalHeader = useMemo(
      () =>
        status === TimelineStatus.draft
          ? timelineType === TimelineType.template
            ? i18n.SAVE_TIMELINE_TEMPLATE
            : i18n.SAVE_TIMELINE
          : timelineType === TimelineType.template
          ? i18n.NAME_TIMELINE_TEMPLATE
          : i18n.NAME_TIMELINE,
      [status, timelineType]
    );

    const saveButtonTitle = useMemo(
      () =>
        status === TimelineStatus.draft && showWarning
          ? timelineType === TimelineType.template
            ? i18n.SAVE_TIMELINE_TEMPLATE
            : i18n.SAVE_TIMELINE
          : i18n.SAVE,
      [showWarning, status, timelineType]
    );

    const calloutMessage = useMemo(
      () => i18n.UNSAVED_TIMELINE_WARNING(timelineType),
      [timelineType]
    );

    const descriptionLabel = useMemo(() => `${i18n.TIMELINE_DESCRIPTION} (${i18n.OPTIONAL})`, []);

    const titleFieldProps = useMemo(
      () => ({
        'aria-label': i18n.TIMELINE_TITLE,
        autoFocus: initialFocus === 'title',
        'data-test-subj': 'save-timeline-title',
        disabled: isSaving,
        spellCheck: true,
        placeholder:
          timelineType === TimelineType.template
            ? commonI18n.UNTITLED_TEMPLATE
            : commonI18n.UNTITLED_TIMELINE,
      }),
      [initialFocus, isSaving, timelineType]
    );

    const descriptionFieldProps = useMemo(
      () => ({
        'aria-label': i18n.TIMELINE_DESCRIPTION,
        autoFocus: initialFocus === 'description',
        'data-test-subj': 'save-timeline-description',
        disabled: isSaving,
        placeholder: commonI18n.DESCRIPTION,
      }),
      [initialFocus, isSaving]
    );

    useEffect(() => {
      if (isSubmitted && !isSaving && prevIsSaving) {
        closeSaveTimeline();
      }
    }, [isSubmitted, isSaving, prevIsSaving, closeSaveTimeline]);

    return (
      <EuiModal
        data-test-subj="save-timeline-modal"
        maxWidth={NOTES_PANEL_WIDTH}
        onClose={closeSaveTimeline}
      >
        {isSaving && (
          <EuiProgress size="s" color="primary" position="absolute" data-test-subj="progress-bar" />
        )}
        <EuiModalHeader data-test-subj="modal-header">{modalHeader}</EuiModalHeader>

        <EuiModalBody>
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
          <Form form={form}>
            <EuiFlexItem grow={true}>
              <CommonUseField
                path="title"
                fullWidth
                label={i18n.TITLE}
                euiFieldProps={titleFieldProps}
              />
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <CommonUseField
                label={descriptionLabel}
                path="description"
                fullWidth
                euiFieldProps={descriptionFieldProps}
              />
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false} component="span">
                  <EuiButton
                    size="s"
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
                    size="s"
                    isDisabled={isSaving || isSubmitting}
                    fill={true}
                    onClick={submit}
                    data-test-subj="save-button"
                  >
                    {saveButtonTitle}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </Form>
        </EuiModalBody>
      </EuiModal>
    );
  }
);

TimelineTitleAndDescription.displayName = 'TimelineTitleAndDescription';
