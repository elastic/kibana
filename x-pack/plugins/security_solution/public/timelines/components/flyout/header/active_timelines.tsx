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
    <EuiFlexGroup>
      <ButtonWrapper grow={false}>
        <EuiButtonEmpty
          data-test-subj="flyoutOverlay"
          size="s"
          isSelected={isOpen}
          onClick={handleToggleOpen}
        >
          {title}
        </EuiButtonEmpty>
      </ButtonWrapper>
    </EuiFlexGroup>
  );
};

export const ActiveTimelines = React.memo(ActiveTimelinesComponent);
