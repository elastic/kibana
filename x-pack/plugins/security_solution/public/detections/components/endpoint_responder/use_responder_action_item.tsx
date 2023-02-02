/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import {
  isAlertFromEndpointEvent,
  isTimelineEventItemAnAlert,
} from '../../../common/utils/endpoint_alert_check';
import { ResponderContextMenuItem } from './responder_context_menu_item';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { getFieldValue } from '../host_isolation/helpers';

export const useResponderActionItem = (
  eventDetailsData: TimelineEventsDetailsItem[] | null,
  onClick: () => void
): JSX.Element[] => {
  const isResponseActionsConsoleEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsConsoleEnabled'
  );
  const { loading: isAuthzLoading, canAccessResponseConsole } =
    useUserPrivileges().endpointPrivileges;

  const isAlert = useMemo(() => {
    return isTimelineEventItemAnAlert(eventDetailsData || []);
  }, [eventDetailsData]);

  const isEndpointAlert = useMemo(() => {
    return isAlertFromEndpointEvent({ data: eventDetailsData || [] });
  }, [eventDetailsData]);

  const endpointId = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, eventDetailsData),
    [eventDetailsData]
  );

  return useMemo(() => {
    const actions: JSX.Element[] = [];

    if (isResponseActionsConsoleEnabled && !isAuthzLoading && canAccessResponseConsole && isAlert) {
      actions.push(
        <ResponderContextMenuItem
          key="endpointResponseActions-action-item"
          endpointId={isEndpointAlert ? endpointId : ''}
          onClick={onClick}
        />
      );
    }

    return actions;
  }, [
    canAccessResponseConsole,
    endpointId,
    isAlert,
    isAuthzLoading,
    isEndpointAlert,
    isResponseActionsConsoleEnabled,
    onClick,
  ]);
};
