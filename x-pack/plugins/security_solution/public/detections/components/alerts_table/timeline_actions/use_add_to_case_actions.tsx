/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { TimelineId } from '../../../../../common/types';
import { APP_ID, APP_UI_ID } from '../../../../../common/constants';
import { useInsertTimeline } from '../../../../cases/components/use_insert_timeline';
import { Ecs } from '../../../../../common/ecs';

export interface UseAddToCaseActions {
  afterCaseSelection: () => void;
  ariaLabel?: string;
  ecsData?: Ecs;
  nonEcsData?: TimelineNonEcsData[];
  timelineId: string;
}

export const useAddToCaseActions = ({
  afterCaseSelection,
  ariaLabel,
  ecsData,
  nonEcsData,
  timelineId,
}: UseAddToCaseActions) => {
  const { timelines: timelinesUi } = useKibana().services;
  const casePermissions = useGetUserCasesPermissions();
  const insertTimelineHook = useInsertTimeline;

  const addToCaseActionProps = useMemo(
    () =>
      ecsData?._id
        ? {
            ariaLabel,
            event: { data: nonEcsData ?? [], ecs: ecsData, _id: ecsData?._id },
            useInsertTimeline: insertTimelineHook,
            casePermissions,
            appId: APP_UI_ID,
            owner: APP_ID,
            onClose: afterCaseSelection,
          }
        : null,
    [ecsData, ariaLabel, nonEcsData, insertTimelineHook, casePermissions, afterCaseSelection]
  );
  const hasWritePermissions = casePermissions?.crud ?? false;
  const addToCaseActionItems = useMemo(
    () =>
      [
        TimelineId.detectionsPage,
        TimelineId.detectionsRulesDetailsPage,
        TimelineId.active,
      ].includes(timelineId as TimelineId) &&
      hasWritePermissions &&
      addToCaseActionProps
        ? [
            timelinesUi.getAddToExistingCaseButton(addToCaseActionProps),
            timelinesUi.getAddToNewCaseButton(addToCaseActionProps),
          ]
        : [],
    [addToCaseActionProps, hasWritePermissions, timelineId, timelinesUi]
  );

  return {
    addToCaseActionItems,
    addToCaseActionProps,
  };
};
