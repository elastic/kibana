/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { isString } from 'lodash/fp';
import { StatefulEventContext } from '@kbn/timelines-plugin/public';
import {
  TimelineId,
  TimelineTabs,
  TimelineExpandedDetailType,
} from '../../../../../../common/types/timeline';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { UserDetailsLink } from '../../../../../common/components/links';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { timelineActions } from '../../../../store/timeline';

interface Props {
  contextId: string;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  isButton?: boolean;
  onClick?: () => void;
  value: string | number | undefined | null;
  title?: string;
}

const UserNameComponent: React.FC<Props> = ({
  fieldName,
  Component,
  contextId,
  eventId,
  isDraggable,
  isButton,
  onClick,
  title,
  value,
}) => {
  const dispatch = useDispatch();
  const eventContext = useContext(StatefulEventContext);
  const userName = `${value}`;

  const isInTimelineContext = userName && eventContext?.timelineID;
  const openUserDetailsSidePanel = useCallback(
    (e) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }
      if (eventContext && isInTimelineContext) {
        const { timelineID, tabType } = eventContext;
        const updatedExpandedDetail: TimelineExpandedDetailType = {
          panelView: 'userDetail',
          params: {
            userName,
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
    [onClick, eventContext, isInTimelineContext, userName, dispatch]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the User Details page
  const content = useMemo(
    () => (
      <UserDetailsLink
        Component={Component}
        userName={userName}
        isButton={isButton}
        onClick={isInTimelineContext ? openUserDetailsSidePanel : undefined}
        title={title}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">{userName}</TruncatableText>
      </UserDetailsLink>
    ),
    [userName, isButton, isInTimelineContext, openUserDetailsSidePanel, Component, title]
  );

  return isString(value) && userName.length > 0 ? (
    isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        isDraggable={isDraggable}
        tooltipContent={fieldName}
        value={userName}
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

export const UserName = React.memo(UserNameComponent);
UserName.displayName = 'UserName';
