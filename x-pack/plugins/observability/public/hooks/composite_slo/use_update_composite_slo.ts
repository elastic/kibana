/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  UpdateSLOInput as UpdateCompositeSLOInput,
  UpdateSLOResponse as UpdateCompositeSLOResponse,
} from '@kbn/slo-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';
import { compositeSloKeys } from '../slo/query_key_factory';

export function useUpdateCompositeSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    ({
      compositeSloId,
      compositeSlo: compositeSlo,
    }: {
      compositeSloId: string;
      compositeSlo: UpdateCompositeSLOInput;
    }) => {
      const body = JSON.stringify(compositeSlo);
      return http.put<UpdateCompositeSLOResponse>(
        `/api/observability/composite_slos/${compositeSloId}`,
        { body }
      );
    },
    {
      mutationKey: ['updateCompositeSlo'],
      onSuccess: (_data, { compositeSlo: { name } }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.update.successNotification', {
            defaultMessage: 'Successfully updated {name}',
            values: { name },
          })
        );
        queryClient.invalidateQueries(compositeSloKeys.lists());
      },
      onError: (error, { compositeSlo: { name } }) => {
        toasts.addError(new Error(String(error)), {
          title: i18n.translate('xpack.observability.slo.update.errorNotification', {
            defaultMessage: 'Something went wrong when updating {name}',
            values: { name },
          }),
        });
      },
    }
  );
}
