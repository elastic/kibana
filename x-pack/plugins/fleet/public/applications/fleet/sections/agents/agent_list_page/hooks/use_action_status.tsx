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

export function useActionStatus(
  onAbortSuccess: () => void,
  refreshAgentActivity: boolean,
  nActions: number,
  dateFilter: moment.Moment | null
) {
  const [isFirstLoading, setIsFirstLoading] = useState(true);
  const [currentActions, setCurrentActions] = useState<ActionStatus[]>([]);
  const [actionCount, setActionCount] = useState(0);
  const [areActionsFullyLoaded, setAreActionsFullyLoaded] = useState(false);
  const { notifications, overlays } = useStartServices();

  const loadActions = useCallback(async () => {
    try {
      const res = await sendGetActionStatus({
        perPage: nActions,
        date: dateFilter?.format(),
      });
      setIsFirstLoading(false);
      if (res.error) {
        throw res.error;
      }
      if (!res.data) {
        throw new Error('No data');
      }
      setAreActionsFullyLoaded(actionCount < nActions);
      setActionCount(res.data.items.length);
      setCurrentActions(res.data.items);
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.actionStatus.fetchRequestError', {
          defaultMessage: 'An error happened while fetching action status',
        }),
      });
    }
  }, [nActions, dateFilter, actionCount, notifications.toasts]);

  if (isFirstLoading) {
    loadActions();
  }

  useEffect(() => {
    if (refreshAgentActivity) {
      loadActions();
    }
  }, [loadActions, refreshAgentActivity]);

  useEffect(() => {
    loadActions();
  }, [loadActions, nActions]);

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
        await Promise.all([loadActions(), onAbortSuccess()]);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.currentUpgrade.abortRequestError', {
            defaultMessage: 'An error happened while cancelling upgrade',
          }),
        });
      }
    },
    [loadActions, notifications.toasts, overlays, onAbortSuccess]
  );

  return {
    currentActions,
    abortUpgrade,
    isFirstLoading,
    areActionsFullyLoaded,
  };
}
