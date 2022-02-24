/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { Case, CommentType } from '../../../../../../cases/common';
import { CaseAttachments } from '../../../../../../cases/public';
import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { TimelineId } from '../../../../../common/types';
import { APP_ID, APP_UI_ID } from '../../../../../common/constants';
import { useInsertTimeline } from '../../../../cases/components/use_insert_timeline';
import { Ecs } from '../../../../../common/ecs';
import { ADD_TO_NEW_CASE } from '../translations';

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
  const { timelines: timelinesUi, cases: casesUi } = useKibana().services;
  const casePermissions = useGetUserCasesPermissions();
  const insertTimelineHook = useInsertTimeline;
  const casesToasts = casesUi.hooks.useCasesToast();

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

  const caseAttachments: CaseAttachments = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            owner: APP_ID,
            type: CommentType.alert,
            rule: casesUi.helpers.getRuleIdFromEvent({ ecs: ecsData, data: nonEcsData ?? [] }),
          },
        ]
      : [];
  }, [casesUi.helpers, ecsData, nonEcsData]);

  const createCaseFlyout = casesUi.hooks.getUseCasesAddToNewCaseFlyout({
    attachments: caseAttachments,
    onSuccess: async (theCase: Case) => {
      casesToasts.showSuccessAttach(theCase);
    },
    onClose: afterCaseSelection,
  });

  const handleAddToNewCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    afterCaseSelection();
    createCaseFlyout.open();
  }, [afterCaseSelection, createCaseFlyout]);

  const addToCaseActionItems = useMemo(() => {
    const items = [];
    if (
      [
        TimelineId.detectionsPage,
        TimelineId.detectionsRulesDetailsPage,
        TimelineId.active,
      ].includes(timelineId as TimelineId) &&
      hasWritePermissions
    ) {
      if (addToCaseActionProps) {
        items.push(timelinesUi.getAddToExistingCaseButton(addToCaseActionProps));
      }
      items.push(
        <EuiContextMenuItem
          aria-label={ariaLabel}
          data-test-subj="cases-actions-add-to-new-case"
          onClick={handleAddToNewCaseClick}
          size="s"
        >
          {ADD_TO_NEW_CASE}
        </EuiContextMenuItem>
      );
    }
    return items;
  }, [
    addToCaseActionProps,
    ariaLabel,
    handleAddToNewCaseClick,
    hasWritePermissions,
    timelineId,
    timelinesUi,
  ]);

  return {
    addToCaseActionItems,
    addToCaseActionProps,
  };
};
