/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useEffect, useState } from 'react';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { getHostMetadata } from './api';
import { fetchPendingActionsByAgentId } from '../../../../common/lib/endpoint_pending_actions';
import { isEndpointHostIsolated } from '../../../../common/utils/validators';
import { HostStatus } from '../../../../../common/endpoint/types';

interface HostIsolationStatusResponse {
  loading: boolean;
  capabilities: string[];
  isIsolated: boolean;
  agentStatus: HostStatus | undefined;
  pendingIsolation: number;
  pendingUnisolation: number;
}

/*
 * Retrieves the current isolation status of a host and the agent/host status */
export const useEndpointHostIsolationStatus = ({
  agentId,
  agentType,
}: {
  agentId: string;
  agentType: ResponseActionAgentType;
}): HostIsolationStatusResponse => {
  const [isIsolated, setIsIsolated] = useState<boolean>(false);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<HostStatus>();
  const [pendingIsolation, setPendingIsolation] = useState(0);
  const [pendingUnisolation, setPendingUnisolation] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const abortCtrl = new AbortController();
    // isMounted tracks if a component is mounted before changing state
    let isMounted = true;
    let fleetAgentId: string;
    setLoading(true);

    const fetchData = async () => {
      try {
        const metadataResponse = await getHostMetadata({ agentId, signal: abortCtrl.signal });
        if (isMounted) {
          setIsIsolated(isEndpointHostIsolated(metadataResponse.metadata));
          if (metadataResponse.metadata.Endpoint.capabilities) {
            setCapabilities([...metadataResponse.metadata.Endpoint.capabilities]);
          }
          setAgentStatus(metadataResponse.host_status);
          fleetAgentId = metadataResponse.metadata.elastic.agent.id;
        }
      } catch (error) {
        // don't show self-aborted requests errors to the user
        if (error.name === 'AbortError') {
          return;
        }

        if (isMounted && error.body.statusCode === 400) {
          setAgentStatus(HostStatus.UNENROLLED);
        }
      }

      if (!(fleetAgentId && fleetAgentId.length)) {
        return;
      }

      try {
        const { data } = await fetchPendingActionsByAgentId(fleetAgentId);
        if (isMounted) {
          setPendingIsolation(data[0].pending_actions?.isolate ?? 0);
          setPendingUnisolation(data[0].pending_actions?.unisolate ?? 0);
        }
      } catch (error) {
        // silently catch non-user initiated error
        return;
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    if (!isEmpty(agentId) && agentType === 'endpoint') {
      fetchData();
    }
    return () => {
      // updates to show component is unmounted
      isMounted = false;
      abortCtrl.abort();
    };
  }, [agentId, agentType]);
  return { loading, capabilities, isIsolated, agentStatus, pendingIsolation, pendingUnisolation };
};
