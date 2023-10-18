/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { getTimelineStatusByIdSelector } from '../../flyout/header/selectors';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { SaveTimelineModal } from './save_timeline_modal';
import * as timelineTranslations from './translations';
import * as sharedTranslations from '../../flyout/header/translations';

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
    kibanaSecuritySolutionsPrivileges: { crud: canEditTimeline },
  } = useUserPrivileges();
  const getTimelineStatus = useMemo(() => getTimelineStatusByIdSelector(), []);
  const {
    status: timelineStatus,
    isSaving,
    updated,
    changed,
  } = useDeepEqualSelector((state) => getTimelineStatus(state, timelineId));

  const isUnsaved = timelineStatus === TimelineStatus.draft;
  // Urge the user to save the timeline because it's not been saved yet or it has changed
  const urgeToSave = isUnsaved || changed;

  let tooltipContent: React.ReactNode = null;
  if (canEditTimeline) {
    if (isUnsaved) {
      tooltipContent = sharedTranslations.UNSAVED;
    } else {
      tooltipContent = (
        <>
          {sharedTranslations.SAVED}{' '}
          <FormattedRelative
            data-test-subj="timeline-status"
            key="timeline-status-autosaved"
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            value={new Date(updated!)}
          />
        </>
      );
    }
  } else {
    tooltipContent = timelineTranslations.CALL_OUT_UNAUTHORIZED_MSG;
  }

  return (
    <EuiToolTip
      content={tooltipContent}
      position="bottom"
      data-test-subj="save-timeline-btn-tooltip"
    >
      <>
        <EuiButton
          fill
          color={urgeToSave ? 'success' : 'primary'}
          onClick={openEditTimeline}
          iconType="save"
          isLoading={isSaving}
          disabled={!canEditTimeline}
          data-test-subj="save-timeline-btn"
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
