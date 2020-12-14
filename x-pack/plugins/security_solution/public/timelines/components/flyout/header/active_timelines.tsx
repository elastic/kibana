/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash/fp';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';
import { TimelineEventsCountBadge } from '../../../../common/hooks/use_timeline_events_count';
import { UNTITLED_TIMELINE, UNTITLED_TEMPLATE } from '../../timeline/properties/translations';
import { timelineActions } from '../../../store/timeline';

const ButtonWrapper = styled(EuiFlexItem)`
  flex-direction: row;
  align-items: center;
`;

interface ActiveTimelinesProps {
  timelineId: string;
  timelineTitle: string;
  timelineType: TimelineType;
  isOpen: boolean;
}

const StyledEuiButtonEmpty = styled(EuiButtonEmpty)`
  > span {
    padding: 0;

    > span {
      display: flex;
      flex-direction: row;
    }
  }
`;

const ActiveTimelinesComponent: React.FC<ActiveTimelinesProps> = ({
  timelineId,
  timelineType,
  timelineTitle,
  isOpen,
}) => {
  const dispatch = useDispatch();

  const handleToggleOpen = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: !isOpen })),
    [dispatch, isOpen, timelineId]
  );

  const title = !isEmpty(timelineTitle)
    ? timelineTitle
    : timelineType === TimelineType.template
    ? UNTITLED_TEMPLATE
    : UNTITLED_TIMELINE;

  return (
    <EuiFlexGroup gutterSize="none">
      <ButtonWrapper grow={false}>
        <StyledEuiButtonEmpty
          data-test-subj="flyoutOverlay"
          size="s"
          isSelected={isOpen}
          onClick={handleToggleOpen}
        >
          {title}
          {!isOpen && <TimelineEventsCountBadge />}
        </StyledEuiButtonEmpty>
      </ButtonWrapper>
    </EuiFlexGroup>
  );
};

export const ActiveTimelines = React.memo(ActiveTimelinesComponent);
