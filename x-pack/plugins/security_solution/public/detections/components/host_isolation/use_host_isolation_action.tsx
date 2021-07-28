/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { HostStatus } from '../../../../common/endpoint/types';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
interface UseHostIsolationProps {
  agentStatus: HostStatus | undefined;
  closePopover: () => void;
  isEndpointAlert: boolean;
  isHostIsolationPanelOpen: boolean;
  isIsolationAllowed: boolean;
  isolationStatus: boolean;
  isolationSupported: boolean;
  loadingHostIsolationStatus: boolean;
  onIsolationStatusChange: (action: 'isolateHost' | 'unisolateHost') => void;
}

export const useHostIsolationAction = ({
  agentStatus,
  closePopover,
  onIsolationStatusChange,
  isEndpointAlert,
  isIsolationAllowed,
  isolationStatus,
  isolationSupported,
  isHostIsolationPanelOpen,
  loadingHostIsolationStatus,
}: UseHostIsolationProps) => {
  const isolateHostHandler = useCallback(() => {
    closePopover();
    if (isolationStatus === false) {
      onIsolationStatusChange('isolateHost');
    } else {
      onIsolationStatusChange('unisolateHost');
    }
  }, [closePopover, isolationStatus, onIsolationStatusChange]);

  const isolateHostTitle = isolationStatus === false ? ISOLATE_HOST : UNISOLATE_HOST;

  const hostIsolationAction =
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
      : [];

  return { hostIsolationAction };
};
