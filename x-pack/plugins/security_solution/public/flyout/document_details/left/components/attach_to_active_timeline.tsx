/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiCallOut, EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useSelector } from 'react-redux';
import { TimelineStatusEnum } from '../../../../../common/api/timeline';
import type { State } from '../../../../common/store';
import { TimelineId } from '../../../../../common/types';
import { SaveTimelineButton } from '../../../../timelines/components/modal/actions/save_timeline_button';
import {
  ATTACH_TO_TIMELINE_CALLOUT_TEST_ID,
  ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID,
  SAVE_TIMELINE_BUTTON_TEST_ID,
} from './test_ids';
import { timelineSelectors } from '../../../../timelines/store';

const timelineCheckBoxId = 'xpack.securitySolution.flyout.notes.attachToTimeline.checkboxId';

export const ATTACH_TO_TIMELINE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.calloutTitle',
  {
    defaultMessage: 'Attach to current Timeline',
  }
);
export const SAVED_TIMELINE_CALLOUT_CONTENT = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.calloutContent',
  {
    defaultMessage: 'Also attach this note to the current Timeline.',
  }
);
export const UNSAVED_TIMELINE_CALLOUT_CONTENT = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.calloutContent',
  {
    defaultMessage: 'You must save the current Timeline before attaching notes to it.',
  }
);
export const ATTACH_TO_TIMELINE_CHECKBOX = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.checkboxLabel',
  {
    defaultMessage: 'Attach to current Timeline',
  }
);
export const SAVE_TIMELINE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.savedTimelineButtonLabel',
  {
    defaultMessage: 'Save current Timeline',
  }
);

export interface AttachToActiveTimelineProps {
  /**
   * Let the parent component know if the user wants to attach the note to the timeline
   */
  setAttachToTimeline: (checked: boolean) => void;
  /**
   * Disables the checkbox (if timeline is not saved)
   */
  isCheckboxDisabled: boolean;
}

/**
 * Renders a callout and a checkbox to allow the user to attach a timeline id to a note.
 * If the active timeline is saved, the UI renders a checkbox to allow the user to attach the note to the timeline.
 * If the active timeline is not saved, the UI renders a button that allows the user to to save the timeline directly from the flyout.
 */
export const AttachToActiveTimeline = memo(
  ({ setAttachToTimeline, isCheckboxDisabled }: AttachToActiveTimelineProps) => {
    const [checked, setChecked] = useState<boolean>(true);

    const timeline = useSelector((state: State) =>
      timelineSelectors.selectTimelineById(state, TimelineId.active)
    );
    const isTimelineSaved: boolean = useMemo(
      () => timeline.status === TimelineStatusEnum.active,
      [timeline.status]
    );

    const onCheckboxChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setChecked(e.target.checked);
        setAttachToTimeline(e.target.checked);
      },
      [setAttachToTimeline]
    );

    return (
      <EuiCallOut
        title={ATTACH_TO_TIMELINE_CALLOUT_TITLE}
        color={isTimelineSaved ? 'primary' : 'warning'}
        iconType="iInCircle"
        data-test-subj={ATTACH_TO_TIMELINE_CALLOUT_TEST_ID}
        css={css`
          margin-left: 50px;
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s">
              {isTimelineSaved ? SAVED_TIMELINE_CALLOUT_CONTENT : UNSAVED_TIMELINE_CALLOUT_CONTENT}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isTimelineSaved ? (
              <EuiCheckbox
                data-test-subj={ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID}
                id={timelineCheckBoxId}
                label={ATTACH_TO_TIMELINE_CHECKBOX}
                disabled={isCheckboxDisabled}
                checked={checked}
                onChange={(e) => onCheckboxChange(e)}
              />
            ) : (
              <SaveTimelineButton
                timelineId={TimelineId.active}
                buttonText={SAVE_TIMELINE_BUTTON}
                buttonColor="warning"
                data-test-subj={SAVE_TIMELINE_BUTTON_TEST_ID}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
);

AttachToActiveTimeline.displayName = 'AttachToActiveTimeline';
