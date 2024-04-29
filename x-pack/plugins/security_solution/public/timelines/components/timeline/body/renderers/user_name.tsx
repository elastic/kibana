/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { isString } from 'lodash/fp';
import { TableId } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { UserPanelKey } from '../../../../../flyout/entity_details/user_right';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import type { ExpandedDetailType } from '../../../../../../common/types';
import { getScopedActions, isTimelineScope } from '../../../../../helpers';
import type { TimelineTabs } from '../../../../../../common/types/timeline';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { UserDetailsLink } from '../../../../../common/components/links';
import { TruncatableText } from '../../../../../common/components/truncatable_text';

interface Props {
  contextId: string;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  eventId: string;
  fieldName: string;
  fieldType: string;
  isAggregatable: boolean;
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
  fieldType,
  isAggregatable,
  isDraggable,
  isButton,
  onClick,
  title,
  value,
}) => {
  const dispatch = useDispatch();
  const eventContext = useContext(StatefulEventContext);
  const isNewUserDetailsFlyoutEnable = useIsExperimentalFeatureEnabled('newUserDetailsFlyout');
  const expandableTimelineFlyoutEnabled = useIsExperimentalFeatureEnabled(
    'expandableTimelineFlyoutEnabled'
  );
  const userName = `${value}`;
  const isInTimelineContext = userName && eventContext?.timelineID;
  const { openRightPanel } = useExpandableFlyoutApi();

  const openUserDetailsSidePanel = useCallback(
    (e) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }

      if (!eventContext || !isInTimelineContext) {
        return;
      }

      const { timelineID, tabType } = eventContext;

      const openNewFlyout = () =>
        openRightPanel({
          id: UserPanelKey,
          params: {
            userName,
            contextID: contextId,
            scopeId: TableId.alertsOnAlertsPage,
            isDraggable,
          },
        });

      const openOldFlyout = () => {
        const updatedExpandedDetail: ExpandedDetailType = {
          panelView: 'userDetail',
          params: {
            userName,
          },
        };
        const scopedActions = getScopedActions(timelineID);
        if (scopedActions) {
          dispatch(
            scopedActions.toggleDetailPanel({
              ...updatedExpandedDetail,
              id: timelineID,
              tabType: tabType as TimelineTabs,
            })
          );
        }
      };

      if (
        (isTimelineScope(timelineID) &&
          isNewUserDetailsFlyoutEnable &&
          expandableTimelineFlyoutEnabled) ||
        isNewUserDetailsFlyoutEnable
      ) {
        openNewFlyout();
      } else {
        openOldFlyout();
      }
    },
    [
      contextId,
      dispatch,
      eventContext,
      expandableTimelineFlyoutEnabled,
      isDraggable,
      isInTimelineContext,
      isNewUserDetailsFlyoutEnable,
      onClick,
      openRightPanel,
      userName,
    ]
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
        fieldType={fieldType}
        isAggregatable={isAggregatable}
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
