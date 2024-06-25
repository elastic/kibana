/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useMemo } from 'react';
import { find, some } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { getAlertDetailsFieldValue } from '../../lib/endpoint/utils/get_event_details_field_values';
import { isAgentTypeAndActionSupported } from '../../lib/endpoint';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import {
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD,
} from '../../../../common/endpoint/service/response_actions/constants';
import { getAgentTypeName } from '../../translations';

export const ALERT_EVENT_DATA_MISSING_AGENT_ID_FIELD = (
  agentTypeName: string,
  missingField: string
): string => {
  return i18n.translate(
    'xpack.securitySolution.useAlertResponseActionsSupport.missingAgentIdField',
    {
      defaultMessage:
        'Alert event data missing {agentTypeName} agent identifier field ({missingField})',
      values: {
        missingField,
        agentTypeName,
      },
    }
  );
};

export const RESPONSE_ACTIONS_ONLY_SUPPORTED_ON_ALERTS = i18n.translate(
  'xpack.securitySolution.useAlertResponseActionsSupport.notAnAlert',
  { defaultMessage: 'Response actions are only supported for Alerts (not events)' }
);

export interface AlertResponseActionsSupport {
  /** Does the host/agent for the given alert have support for response actions */
  isSupported: boolean;

  /** A i18n'd string value indicating the reason why the host does is unsupported */
  unsupportedReason: string | undefined;

  /**
   * If the Event Data provide was for a SIEM alert (generated as a result of a Rule run) or
   * just an event.
   */
  isAlert: boolean;

  /**
   * Full details around support for response actions.
   * NOTE That some data may not be blank if `isSupported` is `false`
   */
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
    /** The field that was/is used to store the agent ID in the ES document */
    agentIdField: string;
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
  }, [eventData]);

  const isFeatureEnabled: boolean = useMemo(() => {
    return agentType ? isAgentTypeAndActionSupported(agentType) : false;
  }, [agentType]);

  const agentId: string = useMemo(() => {
    if (!agentType) {
      return '';
    }

    if (agentType === 'endpoint') {
      return getAlertDetailsFieldValue({ category: 'agent', field: 'agent.id' }, eventData);
    }

    if (agentType === 'sentinel_one') {
      return getAlertDetailsFieldValue(
        { category: 'observer', field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one },
        eventData
      );
    }

    if (agentType === 'crowdstrike') {
      return getAlertDetailsFieldValue(
        { category: 'device', field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.crowdstrike },
        eventData
      );
    }

    return '';
  }, [agentType, eventData]);

  const doesHostSupportResponseActions = useMemo(() => {
    return Boolean(isFeatureEnabled && isAlert && agentId && agentType);
  }, [agentId, agentType, isAlert, isFeatureEnabled]);

  const agentIdField = useMemo(() => {
    if (agentType) {
      return RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD[agentType];
    }

    return '';
  }, [agentType]);

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
    return getAlertDetailsFieldValue({ category: 'host', field: 'host.name' }, eventData);
  }, [eventData]);

  const platform = useMemo(() => {
    // TODO:TC I couldn't find host.os.family in the example data, thus using host.os.type and host.os.platform which are present one at a time in different type of events
    if (agentType === 'crowdstrike') {
      return (
        getAlertDetailsFieldValue({ category: 'host', field: 'host.os.type' }, eventData) ||
        getAlertDetailsFieldValue({ category: 'host', field: 'host.os.platform' }, eventData)
      );
    }

    return getAlertDetailsFieldValue({ category: 'host', field: 'host.os.family' }, eventData);
  }, [agentType, eventData]);

  const unsupportedReason = useMemo(() => {
    if (!doesHostSupportResponseActions) {
      if (!isAlert) {
        return RESPONSE_ACTIONS_ONLY_SUPPORTED_ON_ALERTS;
      }

      if (!agentType) {
        // No message is provided for this condition because the
        // return from this hook will always default to `endpoint`
        return;
      }

      if (!agentId) {
        return ALERT_EVENT_DATA_MISSING_AGENT_ID_FIELD(getAgentTypeName(agentType), agentIdField);
      }
    }
  }, [agentId, agentIdField, agentType, doesHostSupportResponseActions, isAlert]);

  return useMemo<AlertResponseActionsSupport>(() => {
    return {
      isSupported: doesHostSupportResponseActions,
      unsupportedReason,
      isAlert,
      details: {
        agentType: agentType || 'endpoint',
        agentId,
        hostName,
        platform,
        agentIdField,
        agentSupport: supportedActions,
      },
    };
  }, [
    agentId,
    agentIdField,
    agentType,
    doesHostSupportResponseActions,
    hostName,
    isAlert,
    platform,
    supportedActions,
    unsupportedReason,
  ]);
};
