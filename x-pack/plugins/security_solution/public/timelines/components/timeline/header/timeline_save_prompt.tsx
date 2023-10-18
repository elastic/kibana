/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

import { TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions } from '../../../store/timeline';
import { getTimelineSaveModalByIdSelector } from './selectors';
import { SaveTimelineModal } from './save_timeline_modal';
import { TimelineStatus } from '../../../../../common/api/timeline';

interface TimelineSavePromptProps {
  timelineId: string;
}

/**
 * Displays the edit timeline modal with a warning that unsaved changes might get lost.
 * The modal is rendered based on a flag that is set in Redux, in other words, this component
 * only renders the modal when the flag is triggered from outside this component.
 */
export const TimelineSavePrompt = React.memo<TimelineSavePromptProps>(({ timelineId }) => {
  const dispatch = useDispatch();
  const getTimelineSaveModal = useMemo(() => getTimelineSaveModalByIdSelector(), []);
  const { showSaveModal: forceShow, status } = useDeepEqualSelector((state) =>
    getTimelineSaveModal(state, timelineId)
  );
  const isUnsaved = status === TimelineStatus.draft;

  const closeSaveTimeline = useCallback(() => {
    dispatch(
      timelineActions.toggleModalSaveTimeline({
        id: TimelineId.active,
        showModalSaveTimeline: false,
      })
    );
  }, [dispatch]);

  const {
    kibanaSecuritySolutionsPrivileges: { crud: hasKibanaCrud },
  } = useUserPrivileges();

  return forceShow && hasKibanaCrud ? (
    <SaveTimelineModal
      initialFocusOn={isUnsaved ? 'title' : undefined}
      closeSaveTimeline={closeSaveTimeline}
      timelineId={timelineId}
      showWarning={true}
    />
  ) : null;
});

TimelineSavePrompt.displayName = 'TimelineSavePrompt';
