/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { TimelineStatusEnum } from '../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { SaveTimelineModal } from './save_timeline_modal';
import * as i18n from './translations';
import { selectTimelineById } from '../../../store/selectors';
import type { State } from '../../../../common/store';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../../timeline/tour/step_config';

export interface SaveTimelineButtonProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the modal
   */
  timelineId: string;
}

/**
 * Button that allows user to save the timeline. Clicking it opens the `SaveTimelineModal`
 */
export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(({ timelineId }) => {
  const [showEditTimelineOverlay, setShowEditTimelineOverlay] = useState<boolean>(false);
  const toggleSaveTimeline = useCallback(() => setShowEditTimelineOverlay((prev) => !prev), []);

  // Case: 1
  // check if user has crud privileges so that user can be allowed to edit the timeline
  // Case: 2
  // TODO: User may have Crud privileges but they may not have access to timeline index.
  // Do we need to check that?
  const {
    kibanaSecuritySolutionsPrivileges: { crud: canEditTimelinePrivilege },
  } = useUserPrivileges();

  const { status, isSaving } = useSelector((state: State) => selectTimelineById(state, timelineId));

  const canSaveTimeline = canEditTimelinePrivilege && status !== TimelineStatusEnum.immutable;
  const isUnsaved = status === TimelineStatusEnum.draft;
  const unauthorizedMessage = canSaveTimeline ? null : i18n.CALL_OUT_UNAUTHORIZED_MSG;

  return (
    <>
      <EuiToolTip
        content={unauthorizedMessage}
        position="bottom"
        data-test-subj="timeline-modal-save-timeline-tooltip"
      >
        <EuiButton
          id={TIMELINE_TOUR_CONFIG_ANCHORS.SAVE_TIMELINE}
          fill
          size="s"
          iconType="save"
          isLoading={isSaving}
          disabled={!canSaveTimeline}
          data-test-subj="timeline-modal-save-timeline"
          onClick={toggleSaveTimeline}
        >
          {i18n.SAVE}
        </EuiButton>
      </EuiToolTip>
      {showEditTimelineOverlay && canSaveTimeline ? (
        <SaveTimelineModal
          initialFocusOn={isUnsaved ? 'title' : 'save'}
          timelineId={timelineId}
          showWarning={false}
          closeSaveTimeline={toggleSaveTimeline}
        />
      ) : null}
    </>
  );
});

SaveTimelineButton.displayName = 'SaveTimelineButton';
