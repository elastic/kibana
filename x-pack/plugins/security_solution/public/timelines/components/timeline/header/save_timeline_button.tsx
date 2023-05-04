/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

import { TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions } from '../../../store/timeline';
import { getTimelineSaveModalByIdSelector } from './selectors';
import { TimelineTitleAndDescription } from './title_and_description';
import * as timelineTranslations from './translations';

export interface SaveTimelineComponentProps {
  initialFocus: 'title' | 'description';
  timelineId: string;
  toolTip?: string;
}

export const SaveTimelineButton = React.memo<SaveTimelineComponentProps>(
  ({ initialFocus, timelineId, toolTip }) => {
    const dispatch = useDispatch();
    const getTimelineSaveModal = useMemo(() => getTimelineSaveModalByIdSelector(), []);
    const show = useDeepEqualSelector((state) => getTimelineSaveModal(state, timelineId));
    const [showSaveTimelineOverlay, setShowSaveTimelineOverlay] = useState<boolean>(false);

    const closeSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay(false);
      if (show) {
        dispatch(
          timelineActions.toggleModalSaveTimeline({
            id: TimelineId.active,
            showModalSaveTimeline: false,
          })
        );
      }
    }, [dispatch, setShowSaveTimelineOverlay, show]);

    const openSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay(true);
    }, [setShowSaveTimelineOverlay]);

    // Case: 1
    // check if user has crud privileges so that user can be allowed to edit the timeline
    // Case: 2
    // TODO: User may have Crud privileges but they may not have access to timeline index.
    // Do we need to check that?
    const {
      kibanaSecuritySolutionsPrivileges: { crud: hasKibanaCrud },
    } = useUserPrivileges();

    const finalTooltipMsg = useMemo(
      () => (hasKibanaCrud ? toolTip : timelineTranslations.CALL_OUT_UNAUTHORIZED_MSG),
      [toolTip, hasKibanaCrud]
    );

    const saveTimelineButtonIcon = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={timelineTranslations.EDIT}
          isDisabled={!hasKibanaCrud}
          onClick={openSaveTimeline}
          iconType="pencil"
          data-test-subj="save-timeline-button-icon"
        />
      ),
      [openSaveTimeline, hasKibanaCrud]
    );

    return (initialFocus === 'title' && show) || showSaveTimelineOverlay ? (
      <>
        {saveTimelineButtonIcon}
        <TimelineTitleAndDescription
          closeSaveTimeline={closeSaveTimeline}
          initialFocus={initialFocus}
          timelineId={timelineId}
          showWarning={initialFocus === 'title' && show}
        />
      </>
    ) : (
      <EuiToolTip content={finalTooltipMsg ?? ''} data-test-subj="save-timeline-btn-tooltip">
        {saveTimelineButtonIcon}
      </EuiToolTip>
    );
  }
);

SaveTimelineButton.displayName = 'SaveTimelineButton';
