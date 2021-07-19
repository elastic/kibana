/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { isString } from 'lodash/fp';
import { LinkAnchor } from '../../../../../common/components/links';
import {
  TimelineId,
  TimelineTabs,
  TimelineExpandedDetailType,
} from '../../../../../../common/types/timeline';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { StatefulEventContext } from '../events/stateful_event_context';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { timelineActions } from '../../../../store/timeline';
import { SecurityPageName } from '../../../../../../common/constants';
import { useFormatUrl, getHostDetailsUrl } from '../../../../../common/components/link_to';

interface Props {
  contextId: string;
  eventId: string;
  fieldName: string;
  value: string | number | undefined | null;
}

const HostNameComponent: React.FC<Props> = ({ fieldName, contextId, eventId, value }) => {
  const dispatch = useDispatch();
  const eventContext = useContext(StatefulEventContext);
  const hostName = `${value}`;

  const { formatUrl } = useFormatUrl(SecurityPageName.hosts);
  const isInTimelineContext = hostName && eventContext?.tabType && eventContext?.timelineID;

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

  return isString(value) && hostName.length > 0 ? (
    <DefaultDraggable
      field={fieldName}
      id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
      tooltipContent={fieldName}
      value={hostName}
    >
      <LinkAnchor
        href={formatUrl(getHostDetailsUrl(encodeURIComponent(hostName)))}
        data-test-subj="host-details-button"
        // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
        // When this component is used outside of timeline (i.e. in the flyout) we would still like it to link to the Host Details page
        onClick={isInTimelineContext ? openHostDetailsSidePanel : undefined}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">{hostName}</TruncatableText>
      </LinkAnchor>
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );
};

export const HostName = React.memo(HostNameComponent);
HostName.displayName = 'HostName';
