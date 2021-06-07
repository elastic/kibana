/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

import { ApiService, ResponseError } from '../../../../lib/api';

const POLL_INTERVAL = 1000;

export interface SnapshotStatus {
  snapshotId: string;
  jobId: string;
  status: 'complete' | 'in_progress' | 'error' | 'idle';
  action?: 'upgrade' | 'delete';
  nodeId?: string;
}

export const useSnapshotStatus = ({
  jobId,
  snapshotId,
  api,
}: {
  jobId: string;
  snapshotId: string;
  api: ApiService;
}) => {
  const [requestError, setRequestError] = useState<ResponseError | undefined>(undefined);
  const [snapshotState, setSnapshotState] = useState<SnapshotStatus>({
    status: 'idle',
    jobId,
    snapshotId,
  });

  const pollIntervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }
  }, []);

  const updateSnapshotStatus = useCallback(async () => {
    clearPollInterval();

    const { data, error: updateStatusError } = await api.getMlSnapshotUpgradeStatus({
      jobId,
      snapshotId,
    });

    if (updateStatusError) {
      setRequestError(updateStatusError);
      return;
    }

    setSnapshotState(data);

    // Only keep polling if it exists and is in progress.
    if (data?.status === 'in_progress') {
      pollIntervalIdRef.current = setTimeout(updateSnapshotStatus, POLL_INTERVAL);
    }
  }, [api, clearPollInterval, jobId, snapshotId]);

  const upgradeSnapshot = useCallback(async () => {
    setSnapshotState({
      ...snapshotState,
      action: 'upgrade',
      status: 'in_progress',
    });

    const { data, error: upgradeError } = await api.upgradeMlSnapshot({ jobId, snapshotId });

    if (upgradeError) {
      setRequestError(upgradeError);
      setSnapshotState({
        ...snapshotState,
        action: 'upgrade',
        status: 'error',
      });
      return;
    }

    setSnapshotState(data);
    updateSnapshotStatus();
  }, [api, jobId, snapshotId, snapshotState, updateSnapshotStatus]);

  const deleteSnapshot = useCallback(async () => {
    setSnapshotState({
      ...snapshotState,
      action: 'delete',
      status: 'in_progress',
    });

    const { error: deleteError } = await api.deleteMlSnapshot({
      snapshotId,
      jobId,
    });

    if (deleteError) {
      setRequestError(deleteError);
      setSnapshotState({
        ...snapshotState,
        action: 'delete',
        status: 'error',
      });
      return;
    }

    setSnapshotState({
      ...snapshotState,
      action: 'delete',
      status: 'complete',
    });
  }, [api, jobId, snapshotId, snapshotState]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Clean up on unmount.
      clearPollInterval();
    };
  }, [clearPollInterval]);

  return {
    snapshotState: {
      ...snapshotState,
      error: requestError,
    },
    upgradeSnapshot,
    updateSnapshotStatus,
    deleteSnapshot,
  };
};
