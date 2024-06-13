/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import {
  getSentinelOneAgentId,
  isAlertFromSentinelOneEvent,
} from '../../../common/utils/sentinelone_alert_check';
import {
  getCrowdstrikeAgentId,
  isAlertFromCrowdstrikeEvent,
} from '../../../common/utils/crowdstrike_alert_check';
import { useCasesFromAlerts } from '../../containers/detection_engine/alerts/use_cases_from_alerts';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { getFieldValue } from './helpers';
import { IsolateHost } from './isolate';
import { UnisolateHost } from './unisolate';

export const HostIsolationPanel = React.memo(
  ({
    details,
    cancelCallback,
    successCallback,
    isolateAction,
  }: {
    details: TimelineEventsDetailsItem[] | null;
    cancelCallback: () => void;
    successCallback?: () => void;
    isolateAction: string;
  }) => {
    const elasticAgentId = useMemo(
      () => getFieldValue({ category: 'agent', field: 'agent.id' }, details),
      [details]
    );

    const sentinelOneAgentId = useMemo(() => getSentinelOneAgentId(details), [details]);
    const isSentinelOneEvent = useMemo(
      () => details != null && isAlertFromSentinelOneEvent({ data: details }),
      [details]
    );
    const crowdstrikeAgentId = useMemo(() => getCrowdstrikeAgentId(details), [details]);
    const isCrowdstrikeEvent = useMemo(
      () => details != null && isAlertFromCrowdstrikeEvent({ data: details }),
      [details]
    );

    const alertId = useMemo(
      () => getFieldValue({ category: '_id', field: '_id' }, details),
      [details]
    );

    const { casesInfo } = useCasesFromAlerts({ alertId });

    const agentType: ResponseActionAgentType = useMemo(() => {
      if (isSentinelOneEvent) {
        return 'sentinel_one';
      } else if (isCrowdstrikeEvent) {
        return 'crowdstrike';
      } else {
        return 'endpoint';
      }
    }, [isSentinelOneEvent, isCrowdstrikeEvent]);

    const endpointId = useMemo(
      () =>
        (isSentinelOneEvent && sentinelOneAgentId) ||
        (isCrowdstrikeEvent && crowdstrikeAgentId) ||
        elasticAgentId,
      [
        isSentinelOneEvent,
        sentinelOneAgentId,
        isCrowdstrikeEvent,
        crowdstrikeAgentId,
        elasticAgentId,
      ]
    );

    const hostName = useMemo(
      () => getFieldValue({ category: 'host', field: 'host.name' }, details),
      [details]
    );

    return isolateAction === 'isolateHost' ? (
      <IsolateHost
        endpointId={endpointId}
        hostName={hostName}
        casesInfo={casesInfo}
        agentType={agentType}
        cancelCallback={cancelCallback}
        successCallback={successCallback}
      />
    ) : (
      <UnisolateHost
        endpointId={endpointId}
        hostName={hostName}
        casesInfo={casesInfo}
        agentType={agentType}
        cancelCallback={cancelCallback}
        successCallback={successCallback}
      />
    );
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
