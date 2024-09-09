/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import * as i18n from './translations';
import type { State } from '../../../common/store';
import { selectTitleByTimelineById } from '../../store/selectors';
import { AddTimelineButton } from './add_timeline_button';
import { timelineActions } from '../../store';
import { TimelineSaveStatus } from '../save_status';
import { AddToFavoritesButton } from '../add_to_favorites';
import { TimelineEventsCountBadge } from '../../../common/hooks/use_timeline_events_count';

interface TimelineBottomBarProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the modal
   */
  timelineId: string;
  /**
   * True if the timeline modal is open
   */
  show: boolean;

  openToggleRef: React.MutableRefObject<null | HTMLAnchorElement | HTMLButtonElement>;
}

/**
 * This component renders the bottom bar for timeline displayed or most of the pages within Security Solution.
 */
export const TimelineBottomBar = React.memo<TimelineBottomBarProps>(
  ({ show, timelineId, openToggleRef }) => {
    const dispatch = useDispatch();

    const openTimeline = useCallback(
      () => dispatch(timelineActions.showTimeline({ id: timelineId, show: true })),
      [dispatch, timelineId]
    );

    const title = useSelector((state: State) => selectTitleByTimelineById(state, timelineId));

    return (
      <EuiPanel borderRadius="none" data-test-subj="timeline-bottom-bar">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <AddTimelineButton timelineId={timelineId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AddToFavoritesButton timelineId={timelineId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              aria-label={i18n.OPEN_TIMELINE_BUTTON(title)}
              onClick={openTimeline}
              data-test-subj="timeline-bottom-bar-title-button"
              ref={openToggleRef}
            >
              {title}
            </EuiLink>
          </EuiFlexItem>
          {!show && ( // this is a hack because TimelineEventsCountBadge is using react-reverse-portal so the component which is used in multiple places cannot be visible in multiple places at the same time
            <EuiFlexItem grow={false} data-test-subj="timeline-event-count-badge">
              <TimelineEventsCountBadge />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <TimelineSaveStatus timelineId={timelineId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

TimelineBottomBar.displayName = 'TimelineBottomBar';
