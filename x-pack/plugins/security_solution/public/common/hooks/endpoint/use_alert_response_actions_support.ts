/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useMemo } from 'react';
import { find, some } from 'lodash/fp';
import { isAgentTypeAndActionSupported } from '../../lib/endpoint';

// FIXME:PT Move these constants below
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
  details: {
    /** Defaults to `endpoint` when unable to determine agent type */
    agentType: ResponseActionAgentType;
    /** Agent ID could be an empty string if `isSupported` is `false` */
    agentId: string;
    /** Host name could be an empty string if `isSupported` is `false` */
    hostName: string;
    /** The OS platform - normally the ECS value from `host.os.family. could be an empty string if `isSupported` is `false` */
    platform: string;
    /**
     * A map with the response actions supported by this alert's agent type. This is only what is
     * supported, not what the user has privileges to execute.
     */
    agentSupport: AlertAgentActionsSupported;
  };
}

type AlertAgentActionsSupported = Record<ResponseActionsApiCommandNames, boolean>;

/**
 * Determines the level of support that an alert's host has for Response Actions.
 * This hook already checks feature flags to determine the level of support that we have available
 */
export const useAlertResponseActionsSupport = (
  eventData: TimelineEventsDetailsItem[] | null = []
): AlertResponseActionsSupport => {
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

  const isFeatureEnabled: boolean = useMemo(() => {
    return agentType ? isAgentTypeAndActionSupported(agentType) : false;
  }, [agentType]);

  const agentId: string = useMemo(() => {
    if (!isAlert || !agentType) {
      return '';
    }

    if (agentType === 'endpoint') {
      return getFieldValue({ category: 'agent', field: 'agent.id' }, eventData);
    }

    if (agentType === 'sentinel_one') {
      return getFieldValue({ category: 'observer', field: SENTINEL_ONE_AGENT_ID_FIELD }, eventData);
    }

    if (agentType === 'crowdstrike') {
      return getFieldValue(
        { category: 'crowdstrike', field: CROWDSTRIKE_AGENT_ID_FIELD },
        eventData
      );
    }

    return '';
  }, [agentType, eventData, isAlert]);

  const supportedActions = useMemo(() => {
    return RESPONSE_ACTION_API_COMMANDS_NAMES.reduce<AlertAgentActionsSupported>(
      (acc, responseActionName) => {
        acc[responseActionName] = false;

        if (agentType && isFeatureEnabled) {
          acc[responseActionName] = isAgentTypeAndActionSupported(
            agentType,
            responseActionName,
            'manual'
          );
        }

        return acc;
      },
      {} as AlertAgentActionsSupported
    );
  }, [agentType, isFeatureEnabled]);

  const hostName = useMemo(() => {
    return getFieldValue({ category: 'host', field: 'host.os.name' }, eventData);
  }, [eventData]);

  const platform = useMemo(() => {
    return getFieldValue({ category: 'host', field: 'host.os.family' }, eventData);
  }, [eventData]);

  return useMemo<AlertResponseActionsSupport>(() => {
    return {
      isSupported: Boolean(isFeatureEnabled && agentId && agentType),
      details: {
        agentType: agentType || 'endpoint',
        agentId,
        hostName,
        platform,
        agentSupport: supportedActions,
      },
    };
  }, [agentId, agentType, hostName, isFeatureEnabled, platform, supportedActions]);
};
