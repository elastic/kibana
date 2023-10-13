/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { getTimelineStatusByIdSelector } from '../../flyout/header/selectors';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { useEditTimelineModal } from './use_edit_timeline_modal';
import * as timelineTranslations from './translations';
import * as sharedTranslations from '../../flyout/header/translations';

export interface SaveTimelineButtonProps {
  timelineId: string;
}

export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(({ timelineId }) => {
  const { EditModal, canEditTimeline, openEditTimeline } = useEditTimelineModal({
    timelineId,
  });
  const getTimelineStatus = useMemo(() => getTimelineStatusByIdSelector(), []);
  const {
    status: timelineStatus,
    isSaving,
    updated,
    changed,
  } = useDeepEqualSelector((state) => getTimelineStatus(state, timelineId));

  const isUnsaved = timelineStatus === TimelineStatus.draft;
  const urgeToSave = isUnsaved || changed;
  // const { startTransaction } = useStartTransaction();
  // const dispatch = useDispatch();

  // const isDraft = useMemo(() => timelineStatus === TimelineStatus.draft, [timelineStatus]);

  // const onOpen = useCallback(() => {
  //   if (isDraft) {
  //     openEditTimeline();
  //   } else {
  //     startTransaction({ name: TIMELINE_ACTIONS.SAVE });
  //     dispatch(timelineActions.saveTimeline({ id: timelineId }));
  //   }
  // }, [startTransaction, timelineId, dispatch, isDraft, openEditTimeline]);

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

  const buttonColor = urgeToSave ? 'success' : 'primary';
  return (
    <EuiToolTip
      content={tooltipContent}
      position="bottom"
      data-test-subj="save-timeline-btn-tooltip"
    >
      <>
        <EuiButton
          fill
          color={buttonColor}
          onClick={openEditTimeline}
          iconType="save"
          isLoading={isSaving}
          disabled={!canEditTimeline}
          data-test-subj="save-timeline-btn"
        >
          {timelineTranslations.SAVE}
        </EuiButton>
        {EditModal}
      </>
    </EuiToolTip>
  );
});

SaveTimelineButton.displayName = 'SaveTimelineButton';
