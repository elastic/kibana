/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { isAlertFromEndpointEvent } from '../../../common/utils/endpoint_alert_check';
import { ResponseActionsConsoleContextMenuItem } from './response_actions_console_context_menu_item';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { getFieldValue } from '../host_isolation/helpers';

export const useResponseActionsConsoleActionItem = (
  eventDetailsData: TimelineEventsDetailsItem[] | null,
  onClick: () => void
): JSX.Element[] => {
  const isResponseActionsConsoleEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsConsoleEnabled'
  );

  const isEndpointAlert = useMemo(() => {
    return isAlertFromEndpointEvent({ data: eventDetailsData || [] });
  }, [eventDetailsData]);

  const endpointId = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, eventDetailsData),
    [eventDetailsData]
  );

  return useMemo(() => {
    const actions: JSX.Element[] = [];

    if (!eventDetailsData || !isEndpointAlert || !endpointId) {
      return actions;
    }

    if (isResponseActionsConsoleEnabled) {
      actions.push(
        <ResponseActionsConsoleContextMenuItem endpointId={endpointId} onClick={onClick} />
      );
    }

    return actions;
  }, [endpointId, eventDetailsData, isEndpointAlert, isResponseActionsConsoleEnabled, onClick]);
};
