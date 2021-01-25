/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiHealth, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash/fp';
import styled from 'styled-components';
import { FormattedRelative } from '@kbn/i18n/react';

import { TimelineStatus, TimelineType } from '../../../../../common/types/timeline';
import { TimelineEventsCountBadge } from '../../../../common/hooks/use_timeline_events_count';
import {
  ACTIVE_TIMELINE_BUTTON_CLASS_NAME,
  focusActiveTimelineButton,
} from '../../timeline/helpers';
import { UNTITLED_TIMELINE, UNTITLED_TEMPLATE } from '../../timeline/properties/translations';
import { timelineActions } from '../../../store/timeline';
import * as i18n from './translations';

const ButtonWrapper = styled(EuiFlexItem)`
  flex-direction: row;
  align-items: center;
`;

const EuiHealthStyled = styled(EuiHealth)`
  display: block;
`;

interface ActiveTimelinesProps {
  timelineId: string;
  timelineStatus: TimelineStatus;
  timelineTitle: string;
  timelineType: TimelineType;
  isOpen: boolean;
  updated?: number;
}

const StyledEuiButtonEmpty = styled(EuiButtonEmpty)`
  > span {
    padding: 0;
  }
`;

const ActiveTimelinesComponent: React.FC<ActiveTimelinesProps> = ({
  timelineId,
  timelineStatus,
  timelineType,
  timelineTitle,
  updated,
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

  const tooltipContent = useMemo(() => {
    if (timelineStatus === TimelineStatus.draft) {
      return <>{i18n.UNSAVED}</>;
    }
    return (
      <>
        {i18n.AUTOSAVED}{' '}
        <FormattedRelative
          data-test-subj="timeline-status"
          key="timeline-status-autosaved"
          value={new Date(updated!)}
        />
      </>
    );
  }, [timelineStatus, updated]);

  return (
    <EuiFlexGroup gutterSize="none">
      <ButtonWrapper grow={false}>
        <StyledEuiButtonEmpty
          aria-label={i18n.TIMELINE_TOGGLE_BUTTON_ARIA_LABEL({ isOpen, title })}
          className={ACTIVE_TIMELINE_BUTTON_CLASS_NAME}
          flush="both"
          data-test-subj="flyoutOverlay"
          size="s"
          isSelected={isOpen}
          onClick={handleToggleOpen}
        >
          <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiToolTip position="top" content={tooltipContent}>
                <EuiHealthStyled
                  color={timelineStatus === TimelineStatus.draft ? 'warning' : 'success'}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{title}</EuiFlexItem>
            {!isOpen && (
              <EuiFlexItem grow={false}>
                <TimelineEventsCountBadge />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </StyledEuiButtonEmpty>
      </ButtonWrapper>
    </EuiFlexGroup>
  );
};

export const ActiveTimelines = React.memo(ActiveTimelinesComponent);
