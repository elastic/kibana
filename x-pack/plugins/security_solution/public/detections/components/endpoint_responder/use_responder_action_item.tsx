/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { isAlertFromCrowdstrikeEvent } from '../../../common/utils/crowdstrike_alert_check';
import { isAlertFromSentinelOneEvent } from '../../../common/utils/sentinelone_alert_check';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { isTimelineEventItemAnAlert } from '../../../common/utils/endpoint_alert_check';
import { getFieldValue } from '../host_isolation/helpers';
import type { AlertTableContextMenuItem } from '../alerts_table/types';
import { useResponderActionData } from './use_responder_action_data';

export const useResponderActionItem = (
  eventDetailsData: TimelineEventsDetailsItem[] | null,
  onClick: () => void
): AlertTableContextMenuItem[] => {
  const { loading: isAuthzLoading, canAccessResponseConsole } =
    useUserPrivileges().endpointPrivileges;

  const isAlert = useMemo(() => {
    return isTimelineEventItemAnAlert(eventDetailsData || []);
  }, [eventDetailsData]);

  const endpointId: string = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, eventDetailsData),
    [eventDetailsData]
  );

  const agentType: ResponseActionAgentType = useMemo(() => {
    if (!eventDetailsData) {
      return 'endpoint';
    }

    if (isAlertFromSentinelOneEvent({ data: eventDetailsData })) {
      return 'sentinel_one';
    }
    if (isAlertFromCrowdstrikeEvent({ data: eventDetailsData })) {
      return 'crowdstrike';
    }

    return 'endpoint';
  }, [eventDetailsData]);

  const { handleResponseActionsClick, isDisabled, tooltip } = useResponderActionData({
    endpointId,
    onClick,
    agentType,
    eventData: agentType !== 'endpoint' ? eventDetailsData : null,
  });

  return useMemo(() => {
    const actions: AlertTableContextMenuItem[] = [];

    if (!isAuthzLoading && canAccessResponseConsole && isAlert) {
      actions.push({
        key: 'endpointResponseActions-action-item',
        'data-test-subj': 'endpointResponseActions-action-item',
        disabled: isDisabled,
        toolTipContent: tooltip,
        size: 's',
        onClick: handleResponseActionsClick,
        name: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.buttonLabel"
            defaultMessage="Respond"
          />
        ),
      });
    }

    return actions;
  }, [
    canAccessResponseConsole,
    handleResponseActionsClick,
    isAlert,
    isAuthzLoading,
    isDisabled,
    tooltip,
  ]);
};
