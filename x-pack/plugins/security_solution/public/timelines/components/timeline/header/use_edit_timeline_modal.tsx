/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

import { TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions } from '../../../store/timeline';
import { getTimelineSaveModalByIdSelector } from './selectors';
import { EditTimelineModal } from './edit_timeline_modal';

interface UseEditTimelineModalArguments {
  timelineId: string;
  initialFocus?: 'title' | 'description';
}

export function useEditTimelineModal({
  initialFocus = 'title',
  timelineId,
}: UseEditTimelineModalArguments) {
  const dispatch = useDispatch();
  const getTimelineSaveModal = useMemo(() => getTimelineSaveModalByIdSelector(), []);
  const forceShow = useDeepEqualSelector((state) => getTimelineSaveModal(state, timelineId));
  const [showEditTimelineOverlay, setShowEditTimelineOverlay] = useState<boolean>(false);

  const closeEditTimeline = useCallback(() => {
    setShowEditTimelineOverlay(false);
    if (forceShow) {
      dispatch(
        timelineActions.toggleModalSaveTimeline({
          id: TimelineId.active,
          showModalSaveTimeline: false,
        })
      );
    }
  }, [dispatch, setShowEditTimelineOverlay, forceShow]);

  const openEditTimeline = useCallback(() => {
    setShowEditTimelineOverlay(true);
  }, [setShowEditTimelineOverlay]);

  // Case: 1
  // check if user has crud privileges so that user can be allowed to edit the timeline
  // Case: 2
  // TODO: User may have Crud privileges but they may not have access to timeline index.
  // Do we need to check that?
  const {
    kibanaSecuritySolutionsPrivileges: { crud: hasKibanaCrud },
  } = useUserPrivileges();

  return {
    EditModal:
      showEditTimelineOverlay || forceShow ? (
        <EditTimelineModal
          closeEditTimeline={closeEditTimeline}
          initialFocus={initialFocus}
          timelineId={timelineId}
          showWarning={initialFocus === 'title' && forceShow}
        />
      ) : null,
    canEditTimeline: hasKibanaCrud,
    openEditTimeline,
    forceShow,
  };
}
