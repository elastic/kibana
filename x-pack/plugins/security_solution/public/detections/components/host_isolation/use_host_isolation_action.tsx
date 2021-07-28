/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
interface UseHostIsolationProps {
  closePopover: () => void;
  isolationStatus: boolean;
  onIsolationStatusChange: (action: 'isolateHost' | 'unisolateHost') => void;
}

export const useHostIsolationAction = ({
  onIsolationStatusChange,
  isolationStatus,
  closePopover,
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

  return { isolateHostHandler, isolateHostTitle };
};
