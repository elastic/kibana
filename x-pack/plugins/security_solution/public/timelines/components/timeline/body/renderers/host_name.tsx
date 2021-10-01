/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { isString } from 'lodash/fp';
import { HostDetailsLink } from '../../../../../common/components/links';
import {
  TimelineId,
  TimelineTabs,
  TimelineExpandedDetailType,
} from '../../../../../../common/types/timeline';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { timelineActions } from '../../../../store/timeline';
import { StatefulEventContext } from '../../../../../../../timelines/public';

interface Props {
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  value: string | number | undefined | null;
}

const HostNameComponent: React.FC<Props> = ({
  fieldName,
  contextId,
  eventId,
  isDraggable,
  value,
}) => {
  const dispatch = useDispatch();
  const eventContext = useContext(StatefulEventContext);
  const hostName = `${value}`;
  const isInTimelineContext =
    hostName && eventContext?.enableHostDetailsFlyout && eventContext?.timelineID;
  const openHostDetailsSidePanel = useCallback(
    (e) => {
      e.preventDefault();
      if (eventContext && isInTimelineContext) {
        const { timelineID, tabType } = eventContext;
        const updatedExpandedDetail: TimelineExpandedDetailType = {
          panelView: 'hostDetail',
          params: {
            hostName,
          },
        };

        dispatch(
          timelineActions.toggleDetailPanel({
            ...updatedExpandedDetail,
            timelineId: timelineID,
            tabType,
          })
        );

        if (timelineID === TimelineId.active && tabType === TimelineTabs.query) {
          activeTimeline.toggleExpandedDetail({ ...updatedExpandedDetail });
        }
      }
    },
    [dispatch, eventContext, isInTimelineContext, hostName]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the Host Details page
  const content = useMemo(
    () => (
      <HostDetailsLink
        hostName={hostName}
        isButton={false}
        onClick={isInTimelineContext ? openHostDetailsSidePanel : undefined}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">{hostName}</TruncatableText>
      </HostDetailsLink>
    ),
    [hostName, isInTimelineContext, openHostDetailsSidePanel]
  );

  return isString(value) && hostName.length > 0 ? (
    isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        isDraggable={isDraggable}
        tooltipContent={fieldName}
        value={hostName}
      >
        {content}
      </DefaultDraggable>
    ) : (
      content
    )
  ) : (
    getEmptyTagValue()
  );
};

export const HostName = React.memo(HostNameComponent);
HostName.displayName = 'HostName';
