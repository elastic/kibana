/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { sendGetActionStatus, sendPostCancelAction, useStartServices } from '../../../../hooks';

import type { ActionStatus } from '../../../../types';

export function useActionStatus(onAbortSuccess: () => void, refreshAgentActivity: boolean) {
  const [currentActions, setCurrentActions] = useState<ActionStatus[]>([]);
  const [isFirstLoading, setIsFirstLoading] = useState(true);
  const { notifications, overlays } = useStartServices();

  const refreshActions = useCallback(async () => {
    try {
      const res = await sendGetActionStatus();
      setIsFirstLoading(false);
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

  if (isFirstLoading) {
    refreshActions();
  }

  useEffect(() => {
    if (refreshAgentActivity) {
      refreshActions();
    }
  }, [refreshActions, refreshAgentActivity]);

  const abortUpgrade = useCallback(
    async (action: ActionStatus) => {
      try {
        const confirmRes = await overlays.openConfirm(
          i18n.translate('xpack.fleet.currentUpgrade.confirmDescription', {
            defaultMessage:
              'This action will cancel upgrade of {nbAgents, plural, one {# agent} other {# agents}}',
            values: {
              nbAgents: action.nbAgentsActioned - action.nbAgentsAck,
            },
          }),
          {
            title: i18n.translate('xpack.fleet.currentUpgrade.confirmTitle', {
              defaultMessage: 'Cancel upgrade?',
            }),
          }
        );

        if (!confirmRes) {
          return;
        }
        await sendPostCancelAction(action.actionId);
        await Promise.all([refreshActions(), onAbortSuccess()]);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.currentUpgrade.abortRequestError', {
            defaultMessage: 'An error happened while cancelling upgrade',
          }),
        });
      }
    },
    [refreshActions, notifications.toasts, overlays, onAbortSuccess]
  );

  return {
    currentActions,
    refreshActions,
    abortUpgrade,
    isFirstLoading,
  };
}
