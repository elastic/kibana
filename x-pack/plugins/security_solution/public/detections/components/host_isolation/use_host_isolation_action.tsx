/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useGetEndpointDetails } from '../../../management/hooks';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  getSentinelOneAgentId,
  isAlertFromSentinelOneEvent,
} from '../../../common/utils/sentinelone_alert_check';
import { isIsolationSupported } from '../../../../common/endpoint/service/host_isolation/utils';
import { HostStatus } from '../../../../common/endpoint/types';
import { isAlertFromEndpointEvent } from '../../../common/utils/endpoint_alert_check';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { getFieldValue } from './helpers';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { AlertTableContextMenuItem } from '../alerts_table/types';
import { useAgentStatus } from '../../../common/hooks/use_agent_status';

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
  const hasActionsAllPrivileges = useKibana().services.application?.capabilities?.actions?.save;

  const sentinelOneManualHostActionsEnabled = useIsExperimentalFeatureEnabled(
    'sentinelOneManualHostActionsEnabled'
  );
  const { canIsolateHost, canUnIsolateHost } = useUserPrivileges().endpointPrivileges;

  const isEndpointAlert = useMemo(
    () => isAlertFromEndpointEvent({ data: detailsData || [] }),
    [detailsData]
  );

  const isSentinelOneAlert = useMemo(
    () => isAlertFromSentinelOneEvent({ data: detailsData || [] }),
    [detailsData]
  );

  const endpointAgentId = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, detailsData),
    [detailsData]
  );

  const sentinelOneAgentId = useMemo(() => getSentinelOneAgentId(detailsData), [detailsData]);

  const hostOsFamily = useMemo(
    () => getFieldValue({ category: 'host', field: 'host.os.name' }, detailsData),
    [detailsData]
  );

  const agentVersion = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.version' }, detailsData),
    [detailsData]
  );

  const agentType = sentinelOneAgentId ? 'sentinel_one' : 'endpoint';
  const isSentinelOneAgent = agentType === 'sentinel_one';
  const isEndpointAgent = agentType === 'endpoint';

  const agentId = sentinelOneAgentId || endpointAgentId;

  const { data: endpointAgentInfo } = useGetEndpointDetails(agentId, {
    enabled: isEndpointAgent,
  });

  const { data: agentStatusData } = useAgentStatus([agentId], agentType, {
    refetchInterval: 2000,
    enabled: isEndpointAgent || (isSentinelOneAgent && sentinelOneManualHostActionsEnabled),
  });
  const agentStatus = agentStatusData?.[`${agentId}`];

  const isHostIsolated = useMemo(() => {
    if (sentinelOneManualHostActionsEnabled && isSentinelOneAlert) {
      return agentStatus?.isolated;
    }

    return agentStatus?.isolated;
  }, [isSentinelOneAlert, agentStatus?.isolated, sentinelOneManualHostActionsEnabled]);

  const doesHostSupportIsolation = useMemo(() => {
    if (isEndpointAlert) {
      return isIsolationSupported({
        osName: hostOsFamily,
        version: agentVersion,
        capabilities: isSentinelOneAgent
          ? ['isolation']
          : isEndpointAgent
          ? endpointAgentInfo?.metadata?.Endpoint?.capabilities || []
          : [],
      });
    }

    if (sentinelOneManualHostActionsEnabled && isSentinelOneAlert && agentStatus) {
      return agentStatus.status === 'healthy';
    }
    return false;
  }, [
    agentStatus,
    agentVersion,
    endpointAgentInfo?.metadata?.Endpoint?.capabilities,
    hostOsFamily,
    isEndpointAgent,
    isEndpointAlert,
    isSentinelOneAgent,
    isSentinelOneAlert,
    sentinelOneManualHostActionsEnabled,
  ]);

  const isolateHostHandler = useCallback(() => {
    closePopover();
    if (!isHostIsolated) {
      onAddIsolationStatusClick('isolateHost');
    } else {
      onAddIsolationStatusClick('unisolateHost');
    }
  }, [closePopover, isHostIsolated, onAddIsolationStatusClick]);

  const isIsolationActionDisabled = useMemo(() => {
    if (sentinelOneManualHostActionsEnabled && isSentinelOneAlert) {
      return !agentStatus || agentStatus.status === HostStatus.UNENROLLED;
    }

    return agentStatus?.status === HostStatus.UNENROLLED;
  }, [agentStatus, isSentinelOneAlert, sentinelOneManualHostActionsEnabled]);

  const menuItems = useMemo(
    () => [
      {
        key: 'isolate-host-action-item',
        'data-test-subj': 'isolate-host-action-item',
        disabled: isIsolationActionDisabled,
        onClick: isolateHostHandler,
        name: isHostIsolated ? UNISOLATE_HOST : ISOLATE_HOST,
      },
    ],
    [isHostIsolated, isolateHostHandler, isIsolationActionDisabled]
  );

  return useMemo(() => {
    if (isHostIsolationPanelOpen) {
      return [];
    }

    if (
      isSentinelOneAlert &&
      sentinelOneManualHostActionsEnabled &&
      sentinelOneAgentId &&
      agentStatus &&
      hasActionsAllPrivileges
    ) {
      return menuItems;
    }

    if (
      isEndpointAlert &&
      doesHostSupportIsolation &&
      (canIsolateHost || (isHostIsolated && !canUnIsolateHost))
    ) {
      return menuItems;
    }

    return [];
  }, [
    canIsolateHost,
    canUnIsolateHost,
    doesHostSupportIsolation,
    hasActionsAllPrivileges,
    isEndpointAlert,
    isHostIsolated,
    isHostIsolationPanelOpen,
    isSentinelOneAlert,
    menuItems,
    agentStatus,
    sentinelOneAgentId,
    sentinelOneManualHostActionsEnabled,
  ]);
};
