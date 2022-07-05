/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import {
  sendPostBulkAgentTagsUpdate,
  sendPutAgentTagsUpdate,
  useStartServices,
} from '../../../../hooks';

export const useUpdateTags = () => {
  const { notifications } = useStartServices();

  const wrapRequest = useCallback(
    async (requestFn: () => Promise<any>, onSuccess: () => void) => {
      try {
        const res = await requestFn();

        if (res.error) {
          throw res.error;
        }
        const successMessage = i18n.translate(
          'xpack.fleet.updateAgentTags.successNotificationTitle',
          {
            defaultMessage: 'Tags updated',
          }
        );
        notifications.toasts.addSuccess(successMessage);

        onSuccess();
      } catch (error) {
        const errorMessage = i18n.translate('xpack.fleet.updateAgentTags.errorNotificationTitle', {
          defaultMessage: 'Tags update failed',
        });
        notifications.toasts.addError(error, { title: errorMessage });
      }
    },
    [notifications.toasts]
  );

  const updateTags = useCallback(
    async (agentId: string, newTags: string[], onSuccess: () => void) => {
      await wrapRequest(
        async () => await sendPutAgentTagsUpdate(agentId, { tags: newTags }),
        onSuccess
      );
    },
    [wrapRequest]
  );

  const bulkUpdateTags = useCallback(
    async (
      agents: string[] | string,
      tagsToAdd: string[],
      tagsToRemove: string[],
      onSuccess: () => void
    ) => {
      await wrapRequest(
        async () => await sendPostBulkAgentTagsUpdate({ agents, tagsToAdd, tagsToRemove }),
        onSuccess
      );
    },
    [wrapRequest]
  );

  return { updateTags, bulkUpdateTags };
};
