/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { isString } from 'lodash/fp';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostPanelKey } from '../../../../../flyout/entity_details/host_right';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { HostDetailsLink } from '../../../../../common/components/links';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { useIsInSecurityApp } from '../../../../../common/hooks/is_in_security_app';

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

const HostNameComponent: React.FC<Props> = ({
  fieldName,
  fieldType,
  isAggregatable,
  Component,
  contextId,
  eventId,
  isDraggable,
  isButton,
  onClick,
  title,
  value,
}) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const isInSecurityApp = useIsInSecurityApp();

  const eventContext = useContext(StatefulEventContext);
  const hostName = `${value}`;
  const isInTimelineContext =
    hostName && eventContext?.enableHostDetailsFlyout && eventContext?.timelineID;

  const openHostDetailsSidePanel = useCallback(
    (e: React.SyntheticEvent<Element, Event>) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }

      /*
       * if and only if renderer is running inside security solution app
       * we check for event and timeline context
       * */
      if (!eventContext || !isInTimelineContext) {
        return;
      }

      const { timelineID } = eventContext;
      openFlyout({
        right: {
          id: HostPanelKey,
          params: {
            hostName,
            contextID: contextId,
            scopeId: timelineID,
            isDraggable,
          },
        },
      });
    },
    [contextId, eventContext, hostName, isDraggable, isInTimelineContext, onClick, openFlyout]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the Host Details page
  const content = useMemo(
    () => (
      <HostDetailsLink
        Component={Component}
        hostName={hostName}
        isButton={isButton}
        onClick={isInTimelineContext || !isInSecurityApp ? openHostDetailsSidePanel : undefined}
        title={title}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">{hostName}</TruncatableText>
      </HostDetailsLink>
    ),
    [
      Component,
      hostName,
      isButton,
      isInTimelineContext,
      openHostDetailsSidePanel,
      title,
      isInSecurityApp,
    ]
  );

  return isString(value) && hostName.length > 0 ? (
    isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
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
