/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import * as timelineTranslations from './translations';
import { useEditTimelineModal } from './use_edit_timeline_modal';

export interface EditTimelineComponentProps {
  initialFocus: 'title' | 'description';
  timelineId: string;
}

export const EditTimelineButton = React.memo<EditTimelineComponentProps>(
  ({ initialFocus, timelineId }) => {
    const { EditModal, canEditTimeline, openEditTimeline } = useEditTimelineModal({
      timelineId,
      initialFocus,
    });

    const tooltip = canEditTimeline ? '' : timelineTranslations.CALL_OUT_UNAUTHORIZED_MSG;

    const editTimelineButtonIcon = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={timelineTranslations.EDIT}
          isDisabled={!canEditTimeline}
          onClick={openEditTimeline}
          iconType="pencil"
          data-test-subj="edit-timeline-button-icon"
        />
      ),
      [openEditTimeline, canEditTimeline]
    );

    return (
      <EuiToolTip content={tooltip} data-test-subj="edit-timeline-btn-tooltip">
        <>
          {editTimelineButtonIcon}
          {EditModal}
        </>
      </EuiToolTip>
    );
  }
);

EditTimelineButton.displayName = 'EditTimelineButton';
