/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '../../../../common';
import { isIsolationSupported } from '../../../../common/endpoint/service/host_isolation/utils';
import { HostStatus } from '../../../../common/endpoint/types';
import { useIsolationPrivileges } from '../../../common/hooks/endpoint/use_isolate_privileges';
import { endpointAlertCheck } from '../../../common/utils/endpoint_alert_check';
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { getFieldValue } from './helpers';

interface UseHostIsolationActionProps {
  closePopover: () => void;
  detailsData: TimelineEventsDetailsItem[] | null;
  isHostIsolationPanelOpen: boolean;
  onAddIsolationStatusClick: (action: 'isolateHost' | 'unisolateHost') => void;
}

export const useHostIsolationAction = ({
  closePopover,
  detailsData,
  isHostIsolationPanelOpen,
  onAddIsolationStatusClick,
}: UseHostIsolationActionProps) => {
  const isEndpointAlert = useMemo(() => {
    return endpointAlertCheck({ data: detailsData || [] });
  }, [detailsData]);

  const agentId = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, detailsData),
    [detailsData]
  );

  const hostOsFamily = useMemo(
    () => getFieldValue({ category: 'host', field: 'host.os.name' }, detailsData),
    [detailsData]
  );

  const agentVersion = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.version' }, detailsData),
    [detailsData]
  );

  const isolationSupported = isIsolationSupported({
    osName: hostOsFamily,
    version: agentVersion,
  });

  const {
    loading: loadingHostIsolationStatus,
    isIsolated: isolationStatus,
    agentStatus,
  } = useHostIsolationStatus({
    agentId,
  });

  const { isAllowed: isIsolationAllowed } = useIsolationPrivileges();

  const isolateHostHandler = useCallback(() => {
    closePopover();
    if (isolationStatus === false) {
      onAddIsolationStatusClick('isolateHost');
    } else {
      onAddIsolationStatusClick('unisolateHost');
    }
  }, [closePopover, isolationStatus, onAddIsolationStatusClick]);

  const isolateHostTitle = isolationStatus === false ? ISOLATE_HOST : UNISOLATE_HOST;

  const hostIsolationAction = useMemo(
    () =>
      isIsolationAllowed &&
      isEndpointAlert &&
      isolationSupported &&
      isHostIsolationPanelOpen === false
        ? [
            {
              name: isolateHostTitle,
              onClick: isolateHostHandler,
              disabled: loadingHostIsolationStatus || agentStatus === HostStatus.UNENROLLED,
            },
          ]
        : [],
    [
      agentStatus,
      isEndpointAlert,
      isHostIsolationPanelOpen,
      isIsolationAllowed,
      isolateHostHandler,
      isolateHostTitle,
      isolationSupported,
      loadingHostIsolationStatus,
    ]
  );
  return hostIsolationAction;
};
