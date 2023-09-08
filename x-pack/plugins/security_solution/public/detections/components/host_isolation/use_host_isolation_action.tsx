/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { isIsolationSupported } from '../../../../common/endpoint/service/host_isolation/utils';
import { HostStatus } from '../../../../common/endpoint/types';
import { isAlertFromEndpointEvent } from '../../../common/utils/endpoint_alert_check';
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { getFieldValue } from './helpers';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { AlertTableContextMenuItem } from '../alerts_table/types';

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
}: UseHostIsolationActionProps): AlertTableContextMenuItem[] => {
  const { canIsolateHost, canUnIsolateHost } = useUserPrivileges().endpointPrivileges;

  const isEndpointAlert = useMemo(() => {
    return isAlertFromEndpointEvent({ data: detailsData || [] });
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

  const {
    loading: loadingHostIsolationStatus,
    isIsolated: isHostIsolated,
    agentStatus,
    capabilities,
  } = useHostIsolationStatus({
    agentId,
  });

  const doesHostSupportIsolation = useMemo(() => {
    return isEndpointAlert
      ? isIsolationSupported({
          osName: hostOsFamily,
          version: agentVersion,
          capabilities,
        })
      : false;
  }, [agentVersion, capabilities, hostOsFamily, isEndpointAlert]);

  const isolateHostHandler = useCallback(() => {
    closePopover();
    if (!isHostIsolated) {
      onAddIsolationStatusClick('isolateHost');
    } else {
      onAddIsolationStatusClick('unisolateHost');
    }
  }, [closePopover, isHostIsolated, onAddIsolationStatusClick]);

  return useMemo(() => {
    if (
      !isEndpointAlert ||
      !doesHostSupportIsolation ||
      loadingHostIsolationStatus ||
      isHostIsolationPanelOpen
    ) {
      return [];
    }

    const menuItems = [
      {
        key: 'isolate-host-action-item',
        'data-test-subj': 'isolate-host-action-item',
        disabled: agentStatus === HostStatus.UNENROLLED,
        onClick: isolateHostHandler,
        name: isHostIsolated ? UNISOLATE_HOST : ISOLATE_HOST,
      },
    ];

    return canIsolateHost || (isHostIsolated && canUnIsolateHost) ? menuItems : [];
  }, [
    isEndpointAlert,
    doesHostSupportIsolation,
    loadingHostIsolationStatus,
    isHostIsolationPanelOpen,
    agentStatus,
    isolateHostHandler,
    canIsolateHost,
    isHostIsolated,
    canUnIsolateHost,
  ]);
};
