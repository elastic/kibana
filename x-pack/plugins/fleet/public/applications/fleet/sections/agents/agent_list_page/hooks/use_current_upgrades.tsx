/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { sendGetCurrentUpgrades, sendPostCancelAction, useStartServices } from '../../../../hooks';

import type { CurrentUpgrade } from '../../../../types';

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useCurrentUpgrades(onAbortSuccess: () => void) {
  const [currentUpgrades, setCurrentUpgrades] = useState<CurrentUpgrade[]>([]);
  const currentTimeoutRef = useRef<NodeJS.Timeout>();
  const isCancelledRef = useRef<boolean>(false);
  const { notifications, overlays } = useStartServices();

  const refreshUpgrades = useCallback(async () => {
    try {
      const res = await sendGetCurrentUpgrades();
      if (isCancelledRef.current) {
        return;
      }
      if (res.error) {
        throw res.error;
      }

      if (!res.data) {
        throw new Error('No data');
      }

      setCurrentUpgrades(res.data.items);
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.currentUpgrade.fetchRequestError', {
          defaultMessage: 'An error happened while fetching current upgrades',
        }),
      });
    }
  }, [notifications.toasts]);

  const abortUpgrade = useCallback(
    async (currentUpgrade: CurrentUpgrade) => {
      try {
        const confirmRes = await overlays.openConfirm(
          i18n.translate('xpack.fleet.currentUpgrade.confirmDescription', {
            defaultMessage: 'This action will abort upgrade of {nbAgents} agents',
            values: {
              nbAgents: currentUpgrade.nbAgents - currentUpgrade.nbAgentsAck,
            },
          }),
          {
            title: i18n.translate('xpack.fleet.currentUpgrade.confirmTitle', {
              defaultMessage: 'Abort upgrade?',
            }),
          }
        );

        if (!confirmRes) {
          return;
        }
        await sendPostCancelAction(currentUpgrade.actionId);
        await Promise.all([refreshUpgrades(), onAbortSuccess()]);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.currentUpgrade.abortRequestError', {
            defaultMessage: 'An error happened while aborting upgrade',
          }),
        });
      }
    },
    [refreshUpgrades, notifications.toasts, overlays, onAbortSuccess]
  );

  // Poll for upgrades
  useEffect(() => {
    isCancelledRef.current = false;

    async function pollData() {
      await refreshUpgrades();
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
  }, [refreshUpgrades]);

  return {
    currentUpgrades,
    refreshUpgrades,
    abortUpgrade,
  };
}
