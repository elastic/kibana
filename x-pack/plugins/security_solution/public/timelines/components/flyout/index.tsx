/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiWindowEvent, keys } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import type { AppLeaveHandler } from '@kbn/core/public';
import { useDispatch } from 'react-redux';

import type { TimelineId } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { FlyoutBottomBar } from './bottom_bar';
import { Pane } from './pane';
import { getTimelineShowStatusByIdSelector } from './selectors';
import { useTimelineSavePrompt } from '../../../common/hooks/timeline/use_timeline_save_prompt';
import { timelineActions } from '../../store/timeline';
import { focusActiveTimelineButton } from '../timeline/helpers';

interface OwnProps {
  timelineId: TimelineId;
  onAppLeave: (handler: AppLeaveHandler) => void;
}

const FlyoutComponent: React.FC<OwnProps> = ({ timelineId, onAppLeave }) => {
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, timelineId));
  const dispatch = useDispatch();

  const handleClose = useCallback(() => {
    dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
    focusActiveTimelineButton();
  }, [dispatch, timelineId]);

  // ESC key closes Pane
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
        <Pane timelineId={timelineId} visible={show} />
      </EuiFocusTrap>
      <FlyoutBottomBar showTimelineHeaderPanel={!show} timelineId={timelineId} />
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
    </>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
