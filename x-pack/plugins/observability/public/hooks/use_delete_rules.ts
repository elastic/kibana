/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { KueryNode } from '@kbn/es-query';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { useKibana } from '../utils/kibana_react';

export function useDeleteRules() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const deleteRules = useMutation<
    string,
    string,
    { ids: string[]; filter?: KueryNode | null | undefined }
  >(
    ['deleteRules'],
    ({ ids, filter }) => {
      try {
        const body = JSON.stringify({
          ...(ids?.length ? { ids } : {}),
          ...(filter ? { filter: JSON.stringify(filter) } : {}),
        });
        return http.patch(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_delete`, { body });
      } catch (e) {
        throw new Error(`Unable to parse bulk delete params: ${e}`);
      }
    },
    {
      onError: (_err, rule, context) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.observability.rules.deleteConfirmationModal.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to delete rule',
            }
          )
        );
      },

      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.observability.rules.deleteConfirmationModal.successNotification.descriptionText',
            {
              defaultMessage: 'Deleted rule',
            }
          )
        );
      },
    }
  );

  return deleteRules;
}
