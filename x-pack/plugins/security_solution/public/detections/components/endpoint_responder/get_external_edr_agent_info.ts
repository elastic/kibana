/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import type { ThirdPartyAgentInfo } from '../../../../common/types';
import { getSentinelOneAgentId } from '../../../common/utils/sentinelone_alert_check';
import { getFieldValue } from '../host_isolation/helpers';
import { getCrowdstrikeAgentId } from '../../../common/utils/crowdstrike_alert_check';

export const getExternalEdrAgentInfo = (
  eventData: TimelineEventsDetailsItem[],
  agentType: ResponseActionAgentType
): ThirdPartyAgentInfo => {
  switch (agentType) {
    case 'sentinel_one':
      return {
        agent: {
          id: getSentinelOneAgentId(eventData) || '',
          type: getFieldValue(
            { category: 'event', field: 'event.module' },
            eventData
          ) as ResponseActionAgentType,
        },
        host: {
          name: getFieldValue({ category: 'host', field: 'host.name' }, eventData),
          os: {
            name: getFieldValue({ category: 'host', field: 'host.os.name' }, eventData),
            family: getFieldValue({ category: 'host', field: 'host.os.family' }, eventData),
            version: getFieldValue({ category: 'host', field: 'host.os.version' }, eventData),
          },
        },
        lastCheckin: getFieldValue(
          { category: 'kibana', field: 'kibana.alert.last_detected' },
          eventData
        ),
      };
    case 'crowdstrike':
      return {
        agent: {
          id: getCrowdstrikeAgentId(eventData) || '',
          type: agentType,
        },
        host: {
          name: getFieldValue(
            { category: 'crowdstrike', field: 'crowdstrike.event.HostName' },
            eventData
          ),
          os: {
            name: '',
            family: getFieldValue(
              { category: 'crowdstrike', field: 'crowdstrike.event.Platform' },
              eventData
            ),
            version: '',
          },
        },
        lastCheckin: getFieldValue(
          { category: 'kibana', field: 'kibana.alert.last_detected' },
          eventData
        ),
      };
    default:
      throw new Error(`Unsupported agent type: ${agentType}`);
  }
};
