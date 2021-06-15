/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useEffect, useState } from 'react';
import { Maybe } from '../../../../../../observability/common/typings';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getHostMetadata } from './api';
import { ISOLATION_STATUS_FAILURE } from './translations';
import { isEndpointHostIsolated } from '../../../../common/utils/validators';
import { HostStatus } from '../../../../../common/endpoint/types';

interface HostIsolationStatusResponse {
  loading: boolean;
  isIsolated: Maybe<boolean>;
  agentStatus: Maybe<HostStatus>;
}

/*
 * Retrieves the current isolation status of a host and the agent/host status */
export const useHostIsolationStatus = ({
  agentId,
}: {
  agentId: string;
}): HostIsolationStatusResponse => {
  const [isIsolated, setIsIsolated] = useState<Maybe<boolean>>();
  const [agentStatus, setAgentStatus] = useState<HostStatus>();
  const [loading, setLoading] = useState(false);

  const { addError } = useAppToasts();

  useEffect(() => {
    // isMounted tracks if a component is mounted before changing state
    let isMounted = true;
    const fetchData = async () => {
      try {
        const metadataResponse = await getHostMetadata({ agentId });
        if (isMounted) {
          setIsIsolated(isEndpointHostIsolated(metadataResponse.metadata));
          setAgentStatus(metadataResponse.host_status);
        }
      } catch (error) {
        addError(error.message, { title: ISOLATION_STATUS_FAILURE });
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
  return { loading, isIsolated, agentStatus };
};
