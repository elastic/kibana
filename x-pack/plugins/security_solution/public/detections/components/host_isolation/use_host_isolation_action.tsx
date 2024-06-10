/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  getSentinelOneAgentId,
  isAlertFromSentinelOneEvent,
} from '../../../common/utils/sentinelone_alert_check';
import {
  getCrowdstrikeAgentId,
  isAlertFromCrowdstrikeEvent,
} from '../../../common/utils/crowdstrike_alert_check';
import { isIsolationSupported } from '../../../../common/endpoint/service/host_isolation/utils';
import type { AgentStatusInfo } from '../../../../common/endpoint/types';
import { HostStatus } from '../../../../common/endpoint/types';
import { isAlertFromEndpointEvent } from '../../../common/utils/endpoint_alert_check';
import { useEndpointHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { getFieldValue } from './helpers';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { AlertTableContextMenuItem } from '../alerts_table/types';
import { useAgentStatusHook } from '../../../management/hooks/agents/use_get_agent_status';

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
  const useAgentStatus = useAgentStatusHook();

  const hasActionsAllPrivileges = useKibana().services.application?.capabilities?.actions?.save;

  const agentStatusClientEnabled = useIsExperimentalFeatureEnabled('agentStatusClientEnabled');
  const sentinelOneManualHostActionsEnabled = useIsExperimentalFeatureEnabled(
    'sentinelOneManualHostActionsEnabled'
  );
  const crowdstrikeManualHostActionsEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsCrowdstrikeManualHostIsolationEnabled'
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

  const isCrowdstrikeAlert = useMemo(
    () => isAlertFromCrowdstrikeEvent({ data: detailsData || [] }),
    [detailsData]
  );

  const agentId = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, detailsData),
    [detailsData]
  );

  const sentinelOneAgentId = useMemo(() => getSentinelOneAgentId(detailsData), [detailsData]);
  const crowdstrikeAgentId = useMemo(() => getCrowdstrikeAgentId(detailsData), [detailsData]);

  const externalAgentId = sentinelOneAgentId ?? crowdstrikeAgentId ?? '';
  const hostOsFamily = useMemo(
    () => getFieldValue({ category: 'host', field: 'host.os.name' }, detailsData),
    [detailsData]
  );

  const agentVersion = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.version' }, detailsData),
    [detailsData]
  );

  const agentType = useMemo(() => {
    if (isSentinelOneAlert) {
      return 'sentinel_one';
    }
    if (isCrowdstrikeAlert) {
      return 'crowdstrike';
    }
    return 'endpoint';
  }, [isCrowdstrikeAlert, isSentinelOneAlert]);

  const {
    loading: loadingHostIsolationStatus,
    isIsolated,
    agentStatus,
    capabilities,
  } = useEndpointHostIsolationStatus({
    agentId,
    agentType,
  });

  const { data: externalAgentData } = useAgentStatus([externalAgentId], agentType, {
    enabled:
      (!!sentinelOneAgentId && sentinelOneManualHostActionsEnabled) ||
      (!!crowdstrikeAgentId && crowdstrikeManualHostActionsEnabled),
  });

  const externalAgentStatus = externalAgentData?.[externalAgentId];

  const isHostIsolated = useMemo(() => {
    if (
      (sentinelOneManualHostActionsEnabled && isSentinelOneAlert) ||
      (crowdstrikeManualHostActionsEnabled && isCrowdstrikeAlert)
    ) {
      return externalAgentStatus?.isolated;
    }

    return isIsolated;
  }, [
    isIsolated,
    isSentinelOneAlert,
    isCrowdstrikeAlert,
    externalAgentStatus?.isolated,
    sentinelOneManualHostActionsEnabled,
    crowdstrikeManualHostActionsEnabled,
  ]);

  const doesHostSupportIsolation = useMemo(() => {
    if (isEndpointAlert) {
      return isIsolationSupported({
        osName: hostOsFamily,
        version: agentVersion,
        capabilities,
      });
    }

    if (
      (externalAgentStatus && sentinelOneManualHostActionsEnabled && isSentinelOneAlert) ||
      (externalAgentStatus && crowdstrikeManualHostActionsEnabled && isCrowdstrikeAlert)
    ) {
      return externalAgentStatus.status === 'healthy';
    }

    return false;
  }, [
    isEndpointAlert,
    sentinelOneManualHostActionsEnabled,
    isSentinelOneAlert,
    externalAgentStatus,
    crowdstrikeManualHostActionsEnabled,
    isCrowdstrikeAlert,
    hostOsFamily,
    agentVersion,
    capabilities,
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
    if (
      (sentinelOneManualHostActionsEnabled && isSentinelOneAlert) ||
      (crowdstrikeManualHostActionsEnabled && isCrowdstrikeAlert)
    ) {
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
    }

    return agentStatus === HostStatus.UNENROLLED;
  }, [
    agentStatus,
    agentStatusClientEnabled,
    isSentinelOneAlert,
    externalAgentStatus,
    sentinelOneManualHostActionsEnabled,
    crowdstrikeManualHostActionsEnabled,
    isCrowdstrikeAlert,
  ]);

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
      externalAgentStatus &&
      hasActionsAllPrivileges
    ) {
      return menuItems;
    }

    if (
      isCrowdstrikeAlert &&
      crowdstrikeManualHostActionsEnabled &&
      crowdstrikeAgentId &&
      externalAgentStatus &&
      hasActionsAllPrivileges
    ) {
      return menuItems;
    }

    if (
      isEndpointAlert &&
      doesHostSupportIsolation &&
      !loadingHostIsolationStatus &&
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
    loadingHostIsolationStatus,
    menuItems,
    externalAgentStatus,
    sentinelOneAgentId,
    sentinelOneManualHostActionsEnabled,
    crowdstrikeAgentId,
    isCrowdstrikeAlert,
    crowdstrikeManualHostActionsEnabled,
  ]);
};
