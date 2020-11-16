/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonIcon } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash/fp';

import { TimelineType } from '../../../../../common/types/timeline';
import { UNTITLED_TIMELINE, UNTITLED_TEMPLATE } from '../../timeline/properties/translations';
import { useCreateTimeline } from '../../timeline/properties/use_create_timeline';
import { timelineActions } from '../../../store/timeline';

interface ActiveTimelinesProps {
  timelineId: string;
  timelineTitle: string;
  timelineType: TimelineType;
  isOpen: boolean;
}

const ActiveTimelinesComponent: React.FC<ActiveTimelinesProps> = ({
  timelineId,
  timelineType,
  timelineTitle,
  isOpen,
}) => {
  const dispatch = useDispatch();
  const { handleCreateNewTimeline } = useCreateTimeline({ timelineId, timelineType });

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
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" fill={isOpen} onClick={handleToggleOpen}>
          {title}
          <EuiButtonIcon
            iconType="cross"
            aria-label={`Close ${timelineTitle}`}
            onClick={handleCreateNewTimeline}
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ActiveTimelines = React.memo(ActiveTimelinesComponent);
