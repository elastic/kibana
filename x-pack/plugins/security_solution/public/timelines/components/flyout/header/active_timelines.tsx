/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
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
        <EuiButtonEmpty
          data-test-subj="flyoutOverlay"
          size="s"
          isSelected={isOpen}
          onClick={handleToggleOpen}
        >
          {title}
          <EuiButtonIcon
            href="#"
            iconType="cross"
            aria-label={`Close ${timelineTitle}`}
            onClick={handleCreateNewTimeline}
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ActiveTimelines = React.memo(ActiveTimelinesComponent);
