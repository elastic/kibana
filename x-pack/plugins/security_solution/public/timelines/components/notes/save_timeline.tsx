/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { SAVE_TIMELINE_BUTTON_TEST_ID, SAVE_TIMELINE_CALLOUT_TEST_ID } from './test_ids';
import { TimelineId } from '../../../../common/types';
import { SaveTimelineButton } from '../modal/actions/save_timeline_button';

export const SAVE_TIMELINE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.notes.saveTimeline.calloutTitle',
  {
    defaultMessage: 'Save Timeline',
  }
);
export const SAVE_TIMELINE_CALLOUT_CONTENT = i18n.translate(
  'xpack.securitySolution.timeline.notes.saveTimeline.calloutContent',
  {
    defaultMessage: 'You must save this Timeline before attaching notes to it.',
  }
);
export const SAVE_TIMELINE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.saveTimeline.buttonLabel',
  {
    defaultMessage: 'Save Timeline',
  }
);

/**
 * Renders a callout to let the user know they have to save the timeline before creating notes
 */
export const SaveTimelineCallout = memo(() => {
  return (
    <EuiCallOut
      title={SAVE_TIMELINE_CALLOUT_TITLE}
      color="danger"
      iconType="iInCircle"
      data-test-subj={SAVE_TIMELINE_CALLOUT_TEST_ID}
      css={css`
        margin-left: 50px;
      `}
    >
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">{SAVE_TIMELINE_CALLOUT_CONTENT}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SaveTimelineButton
            timelineId={TimelineId.active}
            buttonText={SAVE_TIMELINE_BUTTON}
            buttonColor="danger"
            data-test-subj={SAVE_TIMELINE_BUTTON_TEST_ID}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
});

SaveTimelineCallout.displayName = 'SaveTimelineCallout';
