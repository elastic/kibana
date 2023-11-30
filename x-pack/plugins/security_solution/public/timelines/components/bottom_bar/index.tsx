/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useTimelineTitle } from '../../hooks/use_timeline_title';
import { timelineActions } from '../../store/timeline';
import { TimelineStatusInfo } from '../status_info';
import { AddToFavoritesButton } from '../timeline/properties/helpers';
import {
  ACTIVE_TIMELINE_BUTTON_CLASS_NAME,
  TIMELINE_BOTTOM_BAR_CLASS_NAME,
} from '../timeline/helpers';
import { TimelineEventsCountBadge } from '../../../common/hooks/use_timeline_events_count';

interface FlyoutBottomBarProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the portal
   */
  timelineId: string;
}

/**
 * This component renders the bottom bar for timeline displayed or most of the pages within Security Solution.
 */
export const TimelineBottomBar = React.memo<FlyoutBottomBarProps>(({ timelineId }) => {
  const dispatch = useDispatch();

  const handleToggleOpen = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: true })),
    [dispatch, timelineId]
  );

  const title = useTimelineTitle({ timelineId });

  return (
    <EuiPanel
      paddingSize="s"
      borderRadius="none"
      className={TIMELINE_BOTTOM_BAR_CLASS_NAME}
      data-test-subj="timeline-bottom-bar"
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            aria-label={i18n.translate(
              'xpack.securitySolution.timeline.bottomBar.timelineToggleButtonAriaLabel',
              {
                values: { title },
                defaultMessage: 'Open timeline {title}',
              }
            )}
            className={ACTIVE_TIMELINE_BUTTON_CLASS_NAME}
            flush="both"
            size="s"
            onClick={handleToggleOpen}
            data-test-subj="timeline-bottom-bar-title-button"
            css={css`
              &:active,
              &:focus {
                background: transparent;
              }
            `}
          >
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false} data-test-subj="timeline-title">
                <>{title}</>
              </EuiFlexItem>
              <EuiFlexItem grow={false} data-test-subj="timeline-event-count-badge">
                <TimelineEventsCountBadge />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TimelineStatusInfo timelineId={timelineId} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddToFavoritesButton timelineId={timelineId} compact />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

TimelineBottomBar.displayName = 'TimelineBottomBar';
