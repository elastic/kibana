/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions } from '../../../store/timeline';
import { getTimelineSaveModalByIdSelector } from './selectors';
import { TimelineTitleAndDescription } from './title_and_description';
import { EDIT } from './translations';

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

    const saveTimelineButtonIcon = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={EDIT}
          onClick={openSaveTimeline}
          iconType="pencil"
          data-test-subj="save-timeline-button-icon"
        />
      ),
      [openSaveTimeline]
    );

    return (initialFocus === 'title' && show) || showSaveTimelineOverlay ? (
      <>
        {saveTimelineButtonIcon}
        <TimelineTitleAndDescription
          data-test-subj="save-timeline-modal-comp"
          closeSaveTimeline={closeSaveTimeline}
          initialFocus={initialFocus}
          timelineId={timelineId}
          showWarning={initialFocus === 'title' && show}
        />
      </>
    ) : (
      <EuiToolTip content={toolTip ?? ''} data-test-subj="save-timeline-btn-tooltip">
        {saveTimelineButtonIcon}
      </EuiToolTip>
    );
  }
);

SaveTimelineButton.displayName = 'SaveTimelineButton';
