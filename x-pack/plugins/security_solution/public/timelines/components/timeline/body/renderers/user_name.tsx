/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { isString } from 'lodash/fp';
import { TimelineTabs, TimelineExpandedDetailType } from '../../../../../../common/types/timeline';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { UserDetailsLink } from '../../../../../common/components/links';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
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
  timelineId?: string;
  tabType?: TimelineTabs;
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
  tabType,
  timelineId,
  value,
}) => {
  const dispatch = useDispatch();
  const userName = `${value}`;

  const isInTimeline = timelineId !== undefined;
  const openUserDetailsSidePanel = useCallback(
    (e) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }
      if (isInTimeline) {
        const updatedExpandedDetail: TimelineExpandedDetailType = {
          panelView: 'userDetail',
          params: {
            userName,
          },
        };

        dispatch(
          timelineActions.toggleDetailPanel({
            ...updatedExpandedDetail,
            timelineId,
            tabType,
          })
        );
      }
    },
    [onClick, userName, dispatch, isInTimeline, tabType, timelineId]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the Host Details page
  const content = useMemo(
    () => (
      <UserDetailsLink
        Component={Component}
        userName={userName}
        isButton={isButton}
        onClick={isInTimeline ? openUserDetailsSidePanel : undefined}
        title={title}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">{userName}</TruncatableText>
      </UserDetailsLink>
    ),
    [userName, isButton, isInTimeline, openUserDetailsSidePanel, Component, title]
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
