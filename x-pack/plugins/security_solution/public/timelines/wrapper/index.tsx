/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiWindowEvent, keys } from '@elastic/eui';
import React, { useMemo, useCallback, useRef } from 'react';
import type { AppLeaveHandler } from '@kbn/core/public';
import { useDispatch } from 'react-redux';
import { TimelineModal } from '../components/modal';
import type { TimelineId } from '../../../common/types';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { TimelineBottomBar } from '../components/bottom_bar';
import { getTimelineShowStatusByIdSelector } from '../store/selectors';
import { useTimelineSavePrompt } from '../../common/hooks/timeline/use_timeline_save_prompt';
import { timelineActions } from '../store';

interface TimelineWrapperProps {
  /**
   * Id of the current timeline
   */
  timelineId: TimelineId;
  /**
   * Allows to prompt a save modal when the user tries to leave the Security Solution app
   * @param handler
   */
  onAppLeave: (handler: AppLeaveHandler) => void;
}

/**
 * This component renders the timeline EuiPortal as well as the bottom bar, and handles the interaction between the two.
 * Using EuiFocusTrap, we can trap the focus within the portal when it is open, which prevents closing the portal when clicking outside of it.
 */
export const TimelineWrapper: React.FC<TimelineWrapperProps> = React.memo(
  ({ timelineId, onAppLeave }) => {
    const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
    const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, timelineId));
    const dispatch = useDispatch();
    const openToggleRef = useRef(null);
    const handleClose = useCallback(() => {
      dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
    }, [dispatch, timelineId]);

    // pressing the ESC key closes the timeline portal
    const onKeyDown = useCallback(
      (ev: KeyboardEvent) => {
        if (ev.key === keys.ESCAPE) {
          handleClose();
        }
      },
      [handleClose]
    );

    useTimelineSavePrompt(timelineId, onAppLeave);

    return (
      <>
        <EuiFocusTrap disabled={!show}>
          <TimelineModal timelineId={timelineId} visible={show} openToggleRef={openToggleRef} />
        </EuiFocusTrap>
        <TimelineBottomBar show={show} timelineId={timelineId} openToggleRef={openToggleRef} />
        <EuiWindowEvent event="keydown" handler={onKeyDown} />
      </>
    );
  }
);

TimelineWrapper.displayName = 'TimelineWrapper';
