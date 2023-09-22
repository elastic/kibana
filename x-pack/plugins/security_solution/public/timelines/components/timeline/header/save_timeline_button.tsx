/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { getTimelineStatusByIdSelector } from '../../flyout/header/selectors';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions } from '../../../store/timeline';
import { TIMELINE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useEditTimelineModal } from './use_edit_timeline_modal';
import * as timelineTranslations from './translations';

export interface SaveTimelineButtonProps {
  timelineId: string;
}

export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(({ timelineId }) => {
  const { EditModal, canEditTimeline, openEditTimeline } = useEditTimelineModal({
    timelineId,
  });
  const getTimelineStatus = useMemo(() => getTimelineStatusByIdSelector(), []);
  const { status: timelineStatus, isSaving } = useDeepEqualSelector((state) =>
    getTimelineStatus(state, timelineId)
  );
  const { startTransaction } = useStartTransaction();
  const dispatch = useDispatch();

  const isDraft = useMemo(() => timelineStatus === TimelineStatus.draft, [timelineStatus]);

  const onSave = useCallback(() => {
    if (isDraft) {
      openEditTimeline();
    } else {
      startTransaction({ name: TIMELINE_ACTIONS.SAVE });
      dispatch(timelineActions.saveTimeline({ id: timelineId }));
    }
  }, [startTransaction, timelineId, dispatch, isDraft, openEditTimeline]);

  const tooltip = canEditTimeline ? '' : timelineTranslations.CALL_OUT_UNAUTHORIZED_MSG;

  return (
    <EuiToolTip content={tooltip} data-test-subj="save-timeline-btn-tooltip">
      <>
        <EuiButtonIcon
          aria-label={timelineTranslations.SAVE_TIMELINE}
          display="empty"
          onClick={onSave}
          iconType="save"
          isLoading={isSaving}
          disabled={!canEditTimeline}
        />
        {EditModal}
      </>
    </EuiToolTip>
  );
});

SaveTimelineButton.displayName = 'SaveTimelineButton';
