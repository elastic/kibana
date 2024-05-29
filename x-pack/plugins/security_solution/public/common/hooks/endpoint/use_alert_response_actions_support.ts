/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useMemo } from 'react';
import { find, some } from 'lodash/fp';
import { isActionSupportedByAgentType } from '../../../../common/endpoint/service/response_actions/is_response_action_supported';
import { CROWDSTRIKE_AGENT_ID_FIELD } from '../../utils/crowdstrike_alert_check';
import { SENTINEL_ONE_AGENT_ID_FIELD } from '../../utils/sentinelone_alert_check';
import { getFieldValue } from '../../../detections/components/host_isolation/helpers';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../../../../common/endpoint/service/response_actions/constants';

export interface AlertResponseActionsSupport {
  isSupported: boolean;
  /** Only defined when `isSupported` is set to `true` */
  details?: {
    agentType: ResponseActionAgentType;
    agentId: string;
    /** A map with the response actions supported by this alert's agent type */
    supports: AlertAgentActionsSupported;
  };
}

export interface UseAlertResponseActionsSupportOptions {
  eventData: TimelineEventsDetailsItem[];
}

type AlertAgentActionsSupported = Record<ResponseActionsApiCommandNames, boolean>;

/**
 * Determines the level of support that an alert's host has for Response Actions
 */
export const useAlertResponseActionsSupport = ({
  eventData,
}: UseAlertResponseActionsSupportOptions): AlertResponseActionsSupport => {
  const isAlert = useMemo(() => {
    return some({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, eventData);
  }, [eventData]);

  const agentType: ResponseActionAgentType | undefined = useMemo(() => {
    if (!isAlert) {
      return undefined;
    }

    if ((find({ field: 'agent.type' }, eventData)?.values ?? []).includes('endpoint')) {
      return 'endpoint';
    }

    const eventModuleValues = find({ field: 'event.module' }, eventData)?.values ?? [];

    if (eventModuleValues.includes('sentinel_one')) {
      return 'sentinel_one';
    }

    if (eventModuleValues.includes('crowdstrike')) {
      return 'crowdstrike';
    }

    return undefined;
  }, [eventData, isAlert]);

  const agentId: string = useMemo(() => {
    if (!isAlert || !agentType) {
      return '';
    }

    if (agentType === 'endpoint') {
      getFieldValue({ category: 'agent', field: 'agent.id' }, eventData);
    }

    if (agentType === 'sentinel_one') {
      return getFieldValue({ category: 'observer', field: SENTINEL_ONE_AGENT_ID_FIELD }, eventData);
    }

    if (agentType === 'crowdstrike') {
      getFieldValue({ category: 'crowdstrike', field: CROWDSTRIKE_AGENT_ID_FIELD }, eventData);
    }

    return '';
  }, [agentType, eventData, isAlert]);

  const supportedActions = useMemo(() => {
    return RESPONSE_ACTION_API_COMMANDS_NAMES.reduce<AlertAgentActionsSupported>(
      (acc, responseActionName) => {
        acc[responseActionName] = false;

        if (agentType) {
          acc[responseActionName] = isActionSupportedByAgentType(
            agentType,
            responseActionName,
            'manual'
          );
        }

        return acc;
      },
      {} as AlertAgentActionsSupported
    );
  }, [agentType]);

  return useMemo<AlertResponseActionsSupport>(() => {
    if (agentType && agentId) {
      return {
        isSupported: true,
        details: {
          agentType,
          agentId,
          supports: supportedActions,
        },
      };
    }

    return { isSupported: false };
  }, [agentId, agentType, supportedActions]);
};
