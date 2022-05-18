/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import styled from 'styled-components';
import { RecentTimelineHeader } from './header';
import {
  OnOpenTimeline,
  OpenTimelineResult,
} from '../../../timelines/components/open_timeline/types';
import { WithHoverActions } from '../../../common/components/with_hover_actions';
import { TimelineType } from '../../../../common/types/timeline';

import { RecentTimelineCounts } from './counts';
import * as i18n from './translations';

interface RecentTimelinesItemProps {
  timeline: OpenTimelineResult;
  onOpenTimeline: OnOpenTimeline;
  isLastItem: boolean;
}

const ClampText = styled.div`
  /* Clamp text content to 3 lines */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

const RecentTimelinesItem = React.memo<RecentTimelinesItemProps>(
  ({ timeline, onOpenTimeline, isLastItem }) => {
    const handleClick = useCallback(
      () =>
        onOpenTimeline({
          duplicate: true,
          timelineId: `${timeline.savedObjectId}`,
        }),
      [onOpenTimeline, timeline.savedObjectId]
    );

    const render = useCallback(
      (showHoverContent) => (
        <EuiFlexGroup
          gutterSize="none"
          justifyContent="spaceBetween"
          data-test-subj="overview-recent-timelines"
        >
          <EuiFlexItem grow={false}>
            <RecentTimelineHeader onOpenTimeline={onOpenTimeline} timeline={timeline} />
            <RecentTimelineCounts timeline={timeline} />
            {timeline.description && timeline.description.length && (
              <EuiText color="subdued" size="xs">
                <ClampText>{timeline.description}</ClampText>
              </EuiText>
            )}
          </EuiFlexItem>

          {showHoverContent && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  timeline.timelineType === TimelineType.default
                    ? i18n.OPEN_AS_DUPLICATE
                    : i18n.OPEN_AS_DUPLICATE_TEMPLATE
                }
              >
                <EuiButtonIcon
                  aria-label={
                    timeline.timelineType === TimelineType.default
                      ? i18n.OPEN_AS_DUPLICATE
                      : i18n.OPEN_AS_DUPLICATE_TEMPLATE
                  }
                  data-test-subj="open-duplicate"
                  isDisabled={timeline.savedObjectId == null}
                  iconSize="s"
                  iconType="copy"
                  onClick={handleClick}
                  size="s"
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
      [handleClick, onOpenTimeline, timeline]
    );

    return (
      <>
        <WithHoverActions render={render} />
        <>{!isLastItem && <EuiSpacer size="l" />}</>
      </>
    );
  }
);

RecentTimelinesItem.displayName = 'RecentTimelinesItem';

interface RecentTimelinesProps {
  noTimelinesMessage: string;
  onOpenTimeline: OnOpenTimeline;
  timelines: OpenTimelineResult[];
}

export const RecentTimelines = React.memo<RecentTimelinesProps>(
  ({ noTimelinesMessage, onOpenTimeline, timelines }) => {
    const content = useMemo(
      () =>
        timelines.map((timeline, index) => (
          <RecentTimelinesItem
            key={`${timeline.savedObjectId}-${timeline.title}`}
            timeline={timeline}
            onOpenTimeline={onOpenTimeline}
            isLastItem={index === timelines.length - 1}
          />
        )),
      [onOpenTimeline, timelines]
    );

    if (timelines.length === 0) {
      return (
        <>
          <EuiText color="subdued" size="s">
            {noTimelinesMessage}
          </EuiText>
        </>
      );
    }

    return <>{content}</>;
  }
);

RecentTimelines.displayName = 'RecentTimelines';
