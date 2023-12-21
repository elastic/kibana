/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash/fp';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/api/timeline';
import { TimelineEventsCountBadge } from '../../../../common/hooks/use_timeline_events_count';
import {
  ACTIVE_TIMELINE_BUTTON_CLASS_NAME,
  focusActiveTimelineButton,
} from '../../timeline/helpers';
import { UNTITLED_TIMELINE, UNTITLED_TEMPLATE } from '../../timeline/properties/translations';
import { timelineActions } from '../../../store';
import * as i18n from './translations';

export interface ActiveTimelinesProps {
  timelineId: string;
  timelineTitle: string;
  timelineType: TimelineType;
  isOpen: boolean;
}

const StyledEuiButtonEmpty = styled(EuiButtonEmpty)`
  &:active,
  &:focus {
    background: transparent;
  }
  > span {
    padding: 0;
  }
`;

const TitleConatiner = styled(EuiFlexItem)`
  overflow: hidden;
  display: inline-block;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActiveTimelinesComponent: React.FC<ActiveTimelinesProps> = ({
  timelineId,
  timelineType,
  timelineTitle,
  isOpen,
}) => {
  const dispatch = useDispatch();

  const handleToggleOpen = useCallback(() => {
    dispatch(timelineActions.showTimeline({ id: timelineId, show: !isOpen }));
    focusActiveTimelineButton();
  }, [dispatch, isOpen, timelineId]);

  const title = !isEmpty(timelineTitle)
    ? timelineTitle
    : timelineType === TimelineType.template
    ? UNTITLED_TEMPLATE
    : UNTITLED_TIMELINE;

  const titleContent = useMemo(() => {
    return (
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
      >
        <TitleConatiner data-test-subj="timeline-title" grow={false}>
          {isOpen ? (
            <EuiText grow={false}>
              <h3>{title}</h3>
            </EuiText>
          ) : (
            <>{title}</>
          )}
        </TitleConatiner>
        {!isOpen && (
          <EuiFlexItem grow={false}>
            <TimelineEventsCountBadge />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [isOpen, title]);

  if (isOpen) {
    return <>{titleContent}</>;
  }

  return (
    <StyledEuiButtonEmpty
      aria-label={i18n.TIMELINE_TOGGLE_BUTTON_ARIA_LABEL({ isOpen, title })}
      className={ACTIVE_TIMELINE_BUTTON_CLASS_NAME}
      flush="both"
      data-test-subj="flyoutOverlay"
      size="s"
      isSelected={isOpen}
      onClick={handleToggleOpen}
    >
      {titleContent}
    </StyledEuiButtonEmpty>
  );
};

export const ActiveTimelines = React.memo(ActiveTimelinesComponent);
