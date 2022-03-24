/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

import { ResponseError } from '../../../../../../common/types';
import { ApiService } from '../../../../lib/api';
import { Status } from '../../../types';

const POLL_INTERVAL_MS = 1000;

interface SnapshotStatus {
  snapshotId: string;
  jobId: string;
  status: Status;
  action?: 'upgrade' | 'delete';
}

export interface SnapshotState extends SnapshotStatus {
  error: ResponseError | undefined;
}

export const useSnapshotState = ({
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
      setSnapshotState({
        snapshotId,
        jobId,
        action: 'upgrade',
        status: 'error',
      });
      setRequestError(updateStatusError);
      return;
    }

    setSnapshotState({ ...data, action: 'upgrade' });

    // Only keep polling if it exists and is in progress.
    if (data?.status === 'in_progress') {
      pollIntervalIdRef.current = setTimeout(updateSnapshotStatus, POLL_INTERVAL_MS);
    }
  }, [api, clearPollInterval, jobId, snapshotId]);

  const upgradeSnapshot = useCallback(async () => {
    setSnapshotState({
      snapshotId,
      jobId,
      action: 'upgrade',
      status: 'in_progress',
    });

    const { data, error: upgradeError } = await api.upgradeMlSnapshot({ jobId, snapshotId });

    if (upgradeError) {
      setRequestError(upgradeError);
      setSnapshotState({
        snapshotId,
        jobId,
        action: 'upgrade',
        status: 'error',
      });
      return;
    }

    setSnapshotState({ ...data, action: 'upgrade' });
    updateSnapshotStatus();
  }, [api, jobId, snapshotId, updateSnapshotStatus]);

  const deleteSnapshot = useCallback(async () => {
    setSnapshotState({
      snapshotId,
      jobId,
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
        snapshotId,
        jobId,
        action: 'delete',
        status: 'error',
      });
      return;
    }

    setSnapshotState({
      snapshotId,
      jobId,
      action: 'delete',
      status: 'complete',
    });
  }, [api, jobId, snapshotId]);

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
