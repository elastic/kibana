/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiCallOut, EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  ATTACH_TO_TIMELINE_CALLOUT_TEST_ID,
  ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID,
} from './test_ids';

const timelineCheckBoxId = 'xpack.securitySolution.flyout.notes.attachToTimeline.checkboxId';

export const ATTACH_TO_TIMELINE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.calloutTitle',
  {
    defaultMessage: 'Attach to timeline',
  }
);
export const ATTACH_TO_TIMELINE_CALLOUT_CONTENT = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.calloutContent',
  {
    defaultMessage: 'Before attaching this to timeline you should save the Timeline.',
  }
);
export const ATTACH_TO_TIMELINE_CHECKBOX = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.attachToTimeline.checkboxLabel',
  {
    defaultMessage: 'Attach to active timeline',
  }
);

export interface AttachToActiveTimelineProps {
  /**
   * The timeline id to attach the note to
   */
  timelineId: string;
  /**
   * Callback to let the parent know the timeline id to attach the note to
   */
  setTimelineId: (timelineId: string) => void;
  /**
   * Disables the checkbox (if timeline is not saved)
   */
  isCheckboxDisabled: boolean;
}

/**
 * Renders a callout and a checkbox to allow the user to attach a timeline id to a note.
 * The checkbox is automatically disabled if the flyout is not a timeline flyout or if the timeline is not saved.
 * The checkbox is automatically checked if the flyout is a timeline flyout and the timeline is saved, though the user can uncheck it.
 */
export const AttachToActiveTimeline = memo(
  ({ timelineId, setTimelineId, isCheckboxDisabled }: AttachToActiveTimelineProps) => {
    const [checked, setChecked] = useState<boolean>(true);

    const onCheckboxChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setChecked(e.target.checked);
        setTimelineId(e.target.checked ? timelineId : '');
      },
      [timelineId, setTimelineId]
    );

    return (
      <EuiCallOut
        title={ATTACH_TO_TIMELINE_CALLOUT_TITLE}
        color="warning"
        iconType="iInCircle"
        data-test-subj={ATTACH_TO_TIMELINE_CALLOUT_TEST_ID}
        css={css`
          margin-left: 50px;
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s">{ATTACH_TO_TIMELINE_CALLOUT_CONTENT}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              data-test-subj={ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID}
              id={timelineCheckBoxId}
              label={ATTACH_TO_TIMELINE_CHECKBOX}
              disabled={isCheckboxDisabled}
              checked={checked}
              onChange={(e) => onCheckboxChange(e)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
);

AttachToActiveTimeline.displayName = 'AttachToActiveTimeline';
