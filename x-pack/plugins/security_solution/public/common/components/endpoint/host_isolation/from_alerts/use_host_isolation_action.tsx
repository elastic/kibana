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
import { HostStatus } from '../../../../../../common/endpoint/types';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { useUserPrivileges } from '../../../user_privileges';
import type { AlertTableContextMenuItem } from '../../../../../detections/components/alerts_table/types';
import { useGetAgentStatus } from '../../../../../management/hooks/agents/use_get_agent_status';

export interface UseHostIsolationActionProps {
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
  const { canIsolateHost, canUnIsolateHost } = useUserPrivileges().endpointPrivileges;
  const { data, isLoading, isFetched } = useGetAgentStatus(agentId, agentType, {
    enabled: hostSupportsResponseActions,
  });
  const agentStatus = data?.[agentId];

  const doesHostSupportIsolation = useMemo(() => {
    return hostSupportsResponseActions && isolationSupported;
  }, [hostSupportsResponseActions, isolationSupported]);

  const isHostIsolated = useMemo(() => {
    return Boolean(agentStatus?.isolated);
  }, [agentStatus?.isolated]);

  const isolateHostHandler = useCallback(() => {
    closePopover();

    if (doesHostSupportIsolation) {
      if (!isHostIsolated) {
        onAddIsolationStatusClick('isolateHost');
      } else {
        onAddIsolationStatusClick('unisolateHost');
      }
    }
  }, [closePopover, doesHostSupportIsolation, isHostIsolated, onAddIsolationStatusClick]);

  const isHostAgentUnEnrolled = useMemo<boolean>(() => {
    return (
      !hostSupportsResponseActions ||
      !agentStatus?.found ||
      agentStatus.status === HostStatus.UNENROLLED
    );
  }, [hostSupportsResponseActions, agentStatus]);

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
    } else if (isLoading || !isFetched) {
      menuItem.disabled = true;
      menuItem.toolTipContent = LOADING_ENDPOINT_DATA_TOOLTIP;
    } else if (isHostAgentUnEnrolled) {
      menuItem.disabled = true;
      menuItem.toolTipContent =
        agentType === 'endpoint'
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
    isLoading,
    isFetched,
    agentType,
    unsupportedReason,
  ]);
};
