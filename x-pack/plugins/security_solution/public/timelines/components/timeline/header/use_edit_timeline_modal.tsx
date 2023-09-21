/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

import { EditTimelineModal } from './edit_timeline_modal';

interface UseEditTimelineModalArguments {
  timelineId: string;
  initialFocus?: 'title' | 'description';
}

export function useEditTimelineModal({
  initialFocus = 'title',
  timelineId,
}: UseEditTimelineModalArguments) {
  const [showEditTimelineOverlay, setShowEditTimelineOverlay] = useState<boolean>(false);

  const closeEditTimeline = useCallback(() => {
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
    kibanaSecuritySolutionsPrivileges: { crud: hasKibanaCrud },
  } = useUserPrivileges();

  return {
    EditModal:
      showEditTimelineOverlay && hasKibanaCrud ? (
        <EditTimelineModal
          closeEditTimeline={closeEditTimeline}
          initialFocus={initialFocus}
          timelineId={timelineId}
          showWarning={false}
        />
      ) : null,
    canEditTimeline: hasKibanaCrud,
    openEditTimeline,
    closeEditTimeline,
  };
}
