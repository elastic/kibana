/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getSentinelOneAgentId } from '../../../common/utils/sentinelone_alert_check';
import { useCasesFromAlerts } from '../../containers/detection_engine/alerts/use_cases_from_alerts';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { IsolateSentinelOneHost } from './isolate_sentinelone';
import { UnisolateSentinelOneHost } from './unisolate_sentinelone';
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
    const endpointId = useMemo(
      () => getFieldValue({ category: 'agent', field: 'agent.id' }, details),
      [details]
    );

    const sentinelOneAgentId = useMemo(() => getSentinelOneAgentId(details), [details]);

    const hostName = useMemo(
      () => getFieldValue({ category: 'host', field: 'host.name' }, details),
      [details]
    );

    const alertId = useMemo(
      () => getFieldValue({ category: '_id', field: '_id' }, details),
      [details]
    );

    const { casesInfo } = useCasesFromAlerts({ alertId });

    if (sentinelOneAgentId) {
      return isolateAction === 'isolateHost' ? (
        <IsolateSentinelOneHost
          sentinelOneAgentId={sentinelOneAgentId}
          hostName={hostName}
          cancelCallback={cancelCallback}
          successCallback={successCallback}
        />
      ) : (
        <UnisolateSentinelOneHost
          sentinelOneAgentId={sentinelOneAgentId}
          hostName={hostName}
          cancelCallback={cancelCallback}
          successCallback={successCallback}
        />
      );
    }

    return isolateAction === 'isolateHost' ? (
      <IsolateHost
        endpointId={endpointId}
        hostName={hostName}
        casesInfo={casesInfo}
        cancelCallback={cancelCallback}
        successCallback={successCallback}
      />
    ) : (
      <UnisolateHost
        endpointId={endpointId}
        hostName={hostName}
        casesInfo={casesInfo}
        cancelCallback={cancelCallback}
        successCallback={successCallback}
      />
    );
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
