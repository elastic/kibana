/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

import { SaveTimelineModal } from './save_timeline_modal';
import * as timelineTranslations from './translations';
import { getTimelineStatusByIdSelector } from '../header/selectors';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../../timeline/tour/step_config';

export interface SaveTimelineButtonProps {
  timelineId: string;
}

export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(({ timelineId }) => {
  const [showEditTimelineOverlay, setShowEditTimelineOverlay] = useState<boolean>(false);

  const closeSaveTimeline = useCallback(() => {
    setShowEditTimelineOverlay(false);
  }, []);

  const openEditTimeline = useCallback(() => {
    setShowEditTimelineOverlay(true);
  }, []);

  // Case: 1
  // check if user has crud privileges so that user can be allowed to edit the timeline
  // Case: 2
  // TODO: User may have Crud privileges but they may not have access to timeline index.
  // Do we need to check that?
  const {
    kibanaSecuritySolutionsPrivileges: { crud: canEditTimelinePrivilege },
  } = useUserPrivileges();

  const getTimelineStatus = useMemo(() => getTimelineStatusByIdSelector(), []);

  const { status: timelineStatus, isSaving } = useDeepEqualSelector((state) =>
    getTimelineStatus(state, timelineId)
  );

  const canEditTimeline = canEditTimelinePrivilege && timelineStatus !== TimelineStatus.immutable;

  const isUnsaved = timelineStatus === TimelineStatus.draft;
  const tooltipContent = canEditTimeline ? null : timelineTranslations.CALL_OUT_UNAUTHORIZED_MSG;

  return (
    <EuiToolTip
      content={tooltipContent}
      position="bottom"
      data-test-subj="save-timeline-btn-tooltip"
    >
      <>
        <EuiButton
          id={TIMELINE_TOUR_CONFIG_ANCHORS.SAVE_TIMELINE}
          fill
          color="primary"
          onClick={openEditTimeline}
          size="s"
          iconType="save"
          isLoading={isSaving}
          disabled={!canEditTimeline}
          data-test-subj="save-timeline-action-btn"
        >
          {timelineTranslations.SAVE}
        </EuiButton>
        {showEditTimelineOverlay && canEditTimeline ? (
          <SaveTimelineModal
            closeSaveTimeline={closeSaveTimeline}
            initialFocusOn={isUnsaved ? 'title' : 'save'}
            timelineId={timelineId}
            showWarning={false}
          />
        ) : null}
      </>
    </EuiToolTip>
  );
});

SaveTimelineButton.displayName = 'SaveTimelineButton';
