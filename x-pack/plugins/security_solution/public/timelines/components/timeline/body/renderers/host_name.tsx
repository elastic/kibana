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
import { HostDetailsLink } from '../../../../../common/components/links';
import {
  TimelineId,
  TimelineTabs,
  TimelineExpandedDetailType,
} from '../../../../../../common/types/timeline';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
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

const HostNameComponent: React.FC<Props> = ({
  fieldName,
  Component,
  contextId,
  eventId,
  isDraggable,
  isButton,
  onClick,
  title,
  value,
  timelineId,
  tabType,
}) => {
  const dispatch = useDispatch();
  const hostName = `${value}`;
  const isInTimeline = timelineId === TimelineId.active;
  const openHostDetailsSidePanel = useCallback(
    (e) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }
      if (isInTimeline) {
        const updatedExpandedDetail: TimelineExpandedDetailType = {
          panelView: 'hostDetail',
          params: {
            hostName,
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
    [onClick, hostName, dispatch, timelineId, tabType, isInTimeline]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the Host Details page
  const content = useMemo(
    () => (
      <HostDetailsLink
        Component={Component}
        hostName={hostName}
        isButton={isButton}
        onClick={isInTimeline ? openHostDetailsSidePanel : undefined}
        title={title}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">{hostName}</TruncatableText>
      </HostDetailsLink>
    ),
    [Component, hostName, isButton, isInTimeline, openHostDetailsSidePanel, title]
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
