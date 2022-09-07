/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { sendGetActionStatus, useStartServices } from '../../../../hooks';

import type { ActionStatus } from '../../../../types';

const POLL_INTERVAL = 30 * 1000;

export function useActionStatus() {
  const [currentActions, setCurrentActions] = useState<ActionStatus[]>([]);
  const currentTimeoutRef = useRef<NodeJS.Timeout>();
  const isCancelledRef = useRef<boolean>(false);
  const { notifications } = useStartServices();

  const refreshActions = useCallback(async () => {
    try {
      const res = await sendGetActionStatus();
      if (isCancelledRef.current) {
        return;
      }
      if (res.error) {
        throw res.error;
      }

      if (!res.data) {
        throw new Error('No data');
      }

      setCurrentActions(res.data.items);
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.actionStatus.fetchRequestError', {
          defaultMessage: 'An error happened while fetching action status',
        }),
      });
    }
  }, [notifications.toasts]);

  // Poll for upgrades
  useEffect(() => {
    isCancelledRef.current = false;

    async function pollData() {
      await refreshActions();
      if (isCancelledRef.current) {
        return;
      }
      currentTimeoutRef.current = setTimeout(() => pollData(), POLL_INTERVAL);
    }

    pollData();

    return () => {
      isCancelledRef.current = true;

      if (currentTimeoutRef.current) {
        clearTimeout(currentTimeoutRef.current);
      }
    };
  }, [refreshActions]);

  return {
    currentActions,
    refreshActions,
  };
}
