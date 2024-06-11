/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
} from '../../responder';
import { useAlertResponseActionsSupport } from '../../../../hooks/endpoint/use_alert_response_actions_support';
import { useIsExperimentalFeatureEnabled } from '../../../../hooks/use_experimental_features';
import type { AgentStatusInfo } from '../../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../../common/endpoint/types';
import { useEndpointHostIsolationStatus } from './use_host_isolation_status';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { useUserPrivileges } from '../../../user_privileges';
import type { AlertTableContextMenuItem } from '../../../../../detections/components/alerts_table/types';
import { useAgentStatusHook } from '../../../../../management/hooks/agents/use_get_agent_status';

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
  const {
    isSupported: hostSupportsResponseActions,
    isAlert,
    unsupportedReason,
    details: {
      agentType,
      agentId,
      agentSupport: { isolate: isolationSupported },
    },
  } = useAlertResponseActionsSupport(detailsData);
  const agentStatusClientEnabled = useIsExperimentalFeatureEnabled('agentStatusClientEnabled');
  const useAgentStatus = useAgentStatusHook();
  const { canIsolateHost, canUnIsolateHost } = useUserPrivileges().endpointPrivileges;

  const isEndpointAgent = useMemo(() => {
    return agentType === 'endpoint';
  }, [agentType]);

  const {
    loading: loadingHostIsolationStatus,
    isIsolated,
    agentStatus,
    capabilities,
  } = useEndpointHostIsolationStatus({
    agentId,
    agentType,
  });

  const { data: externalAgentData } = useAgentStatus([agentId], agentType, {
    enabled: hostSupportsResponseActions && !isEndpointAgent,
  });

  const externalAgentStatus = externalAgentData?.[agentId];

  const isHostIsolated = useMemo((): boolean => {
    if (!isEndpointAgent) {
      return Boolean(externalAgentStatus?.isolated);
    }

    return isIsolated;
  }, [isEndpointAgent, isIsolated, externalAgentStatus?.isolated]);

  const doesHostSupportIsolation = useMemo(() => {
    // With Elastic Defend Endpoint, we check that the actual `endpoint` agent on
    // this host reported that capability
    if (agentType === 'endpoint') {
      return capabilities.includes('isolation');
    }

    return Boolean(externalAgentStatus?.found && isolationSupported);
  }, [agentType, externalAgentStatus?.found, isolationSupported, capabilities]);

  const isolateHostHandler = useCallback(() => {
    closePopover();
    if (!isHostIsolated) {
      onAddIsolationStatusClick('isolateHost');
    } else {
      onAddIsolationStatusClick('unisolateHost');
    }
  }, [closePopover, isHostIsolated, onAddIsolationStatusClick]);

  const isHostAgentUnEnrolled = useMemo<boolean>(() => {
    if (!hostSupportsResponseActions) {
      return true;
    }

    if (isEndpointAgent) {
      return agentStatus === HostStatus.UNENROLLED;
    }

    // NON-Endpoint agent types
    // 8.15 use FF for computing if action is enabled
    if (agentStatusClientEnabled) {
      return externalAgentStatus?.status === HostStatus.UNENROLLED;
    }

    // else use the old way
    if (!externalAgentStatus) {
      return true;
    }

    const { isUninstalled, isPendingUninstall } = externalAgentStatus as AgentStatusInfo[string];

    return isUninstalled || isPendingUninstall;
  }, [
    hostSupportsResponseActions,
    isEndpointAgent,
    agentStatusClientEnabled,
    externalAgentStatus,
    agentStatus,
  ]);

  return useMemo<AlertTableContextMenuItem[]>(() => {
    // If not an Alert OR user has no Authz, then don't show the menu item at all
    if (!isAlert || (isHostIsolated && !canUnIsolateHost) || !canIsolateHost) {
      return [];
    }

    const menuItem: AlertTableContextMenuItem = {
      key: 'isolate-host-action-item',
      'data-test-subj': 'isolate-host-action-item',
      disabled: isHostAgentUnEnrolled || isHostIsolationPanelOpen,
      onClick: isolateHostHandler,
      name: isHostIsolated ? UNISOLATE_HOST : ISOLATE_HOST,
    };

    // Determine if menu item should be disabled
    if (!doesHostSupportIsolation) {
      menuItem.disabled = true;
      // If we were able to calculate the agentType and we have a reason why the host is does not
      // support response actions, then show that as the tooltip. Else, just show the normal "enroll" message
      menuItem.toolTipContent =
        agentType && unsupportedReason ? unsupportedReason : NOT_FROM_ENDPOINT_HOST_TOOLTIP;
    } else if (isEndpointAgent && loadingHostIsolationStatus) {
      menuItem.disabled = true;
      menuItem.toolTipContent = LOADING_ENDPOINT_DATA_TOOLTIP;
    } else if (isHostAgentUnEnrolled) {
      menuItem.disabled = true;
      menuItem.toolTipContent = isEndpointAgent
        ? HOST_ENDPOINT_UNENROLLED_TOOLTIP
        : NOT_FROM_ENDPOINT_HOST_TOOLTIP;
    }

    return [menuItem];
  }, [
    isAlert,
    isHostIsolated,
    canUnIsolateHost,
    canIsolateHost,
    isHostAgentUnEnrolled,
    isHostIsolationPanelOpen,
    isolateHostHandler,
    doesHostSupportIsolation,
    isEndpointAgent,
    loadingHostIsolationStatus,
    agentType,
    unsupportedReason,
  ]);
};
