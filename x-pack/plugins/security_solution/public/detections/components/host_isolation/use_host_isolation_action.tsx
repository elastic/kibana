/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  getSentinelOneAgentId,
  isAlertFromSentinelOneEvent,
} from '../../../common/utils/sentinelone_alert_check';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { isIsolationSupported } from '../../../../common/endpoint/service/host_isolation/utils';
import { HostStatus } from '../../../../common/endpoint/types';
import { isAlertFromEndpointEvent } from '../../../common/utils/endpoint_alert_check';
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { getFieldValue } from './helpers';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { AlertTableContextMenuItem } from '../alerts_table/types';
import { useSentinelOneAgentData } from './use_sentinelone_host_isolation';

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

  const agentId = useMemo(
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

  const {
    loading: loadingHostIsolationStatus,
    isIsolated,
    agentStatus,
    capabilities,
  } = useHostIsolationStatus({
    agentId,
  });

  const { data: sentinelOneResponse } = useSentinelOneAgentData({ agentId: sentinelOneAgentId });

  const sentinelOneAgentData = useMemo(
    () => sentinelOneResponse?.data?.data?.[0],
    [sentinelOneResponse]
  );

  const isHostIsolated = useMemo(() => {
    if (sentinelOneManualHostActionsEnabled && isSentinelOneAlert) {
      return sentinelOneAgentData?.networkStatus === 'disconnected';
    }

    return isIsolated;
  }, [
    isIsolated,
    isSentinelOneAlert,
    sentinelOneAgentData?.networkStatus,
    sentinelOneManualHostActionsEnabled,
  ]);

  const doesHostSupportIsolation = useMemo(() => {
    if (isEndpointAlert) {
      return isIsolationSupported({
        osName: hostOsFamily,
        version: agentVersion,
        capabilities,
      });
    }

    if (sentinelOneManualHostActionsEnabled && isSentinelOneAlert && sentinelOneAgentData) {
      return sentinelOneAgentData.isActive;
    }
    return false;
  }, [
    agentVersion,
    capabilities,
    hostOsFamily,
    isEndpointAlert,
    isSentinelOneAlert,
    sentinelOneAgentData,
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

  const menuItemDisabled = useMemo(() => {
    if (sentinelOneManualHostActionsEnabled && isSentinelOneAlert) {
      return (
        !sentinelOneAgentData ||
        sentinelOneAgentData?.isUninstalled ||
        sentinelOneAgentData?.isPendingUninstall
      );
    }

    return agentStatus === HostStatus.UNENROLLED;
  }, [agentStatus, isSentinelOneAlert, sentinelOneAgentData, sentinelOneManualHostActionsEnabled]);

  const menuItems = useMemo(
    () => [
      {
        key: 'isolate-host-action-item',
        'data-test-subj': 'isolate-host-action-item',
        disabled: menuItemDisabled,
        onClick: isolateHostHandler,
        name: isHostIsolated ? UNISOLATE_HOST : ISOLATE_HOST,
      },
    ],
    [isHostIsolated, isolateHostHandler, menuItemDisabled]
  );

  return useMemo(() => {
    if (isHostIsolationPanelOpen) {
      return [];
    }

    if (
      isSentinelOneAlert &&
      sentinelOneManualHostActionsEnabled &&
      sentinelOneAgentId &&
      sentinelOneAgentData &&
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
    sentinelOneAgentData,
    sentinelOneAgentId,
    sentinelOneManualHostActionsEnabled,
  ]);
};
