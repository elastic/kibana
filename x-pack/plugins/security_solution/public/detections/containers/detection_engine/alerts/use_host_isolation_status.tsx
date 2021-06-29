/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useEffect, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getHostMetadata } from './api';
import { ISOLATION_STATUS_FAILURE, ISOLATION_PENDING_FAILURE } from './translations';
import { fetchPendingActionsByAgentId } from '../../../../common/lib/endpoint_pending_actions';
import { isEndpointHostIsolated } from '../../../../common/utils/validators';
import { HostStatus } from '../../../../../common/endpoint/types';

interface HostIsolationStatusResponse {
  loading: boolean;
  isIsolated: boolean;
  agentStatus: HostStatus;
  pendingIsolation: number;
  pendingUnisolation: number;
}

/*
 * Retrieves the current isolation status of a host and the agent/host status */
export const useHostIsolationStatus = ({
  agentId,
}: {
  agentId: string;
}): HostIsolationStatusResponse => {
  const [isIsolated, setIsIsolated] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<HostStatus>(HostStatus.UNHEALTHY);
  const [pendingIsolation, setPendingIsolation] = useState(0);
  const [pendingUnisolation, setPendingUnisolation] = useState(0);
  const [loading, setLoading] = useState(false);

  const { addError } = useAppToasts();

  useEffect(() => {
    // isMounted tracks if a component is mounted before changing state
    let isMounted = true;
    let fleetAgentId: string;
    const fetchData = async () => {
      try {
        const metadataResponse = await getHostMetadata({ agentId });
        if (isMounted) {
          setIsIsolated(isEndpointHostIsolated(metadataResponse.metadata));
          setAgentStatus(metadataResponse.host_status);
          fleetAgentId = metadataResponse.metadata.elastic.agent.id;
        }
      } catch (error) {
        addError(error.message, { title: ISOLATION_STATUS_FAILURE });
      }

      try {
        const { data } = await fetchPendingActionsByAgentId(fleetAgentId);
        if (isMounted) {
          setPendingIsolation(data[0].pending_actions?.isolate ?? 0);
          setPendingUnisolation(data[0].pending_actions?.unisolate ?? 0);
        }
      } catch (error) {
        addError(error.message, { title: ISOLATION_PENDING_FAILURE });
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    setLoading((prevState) => {
      if (prevState) {
        return prevState;
      }
      if (!isEmpty(agentId)) {
        fetchData();
      }
      return true;
    });
    return () => {
      // updates to show component is unmounted
      isMounted = false;
    };
  }, [addError, agentId]);
  return { loading, isIsolated, agentStatus, pendingIsolation, pendingUnisolation };
};
