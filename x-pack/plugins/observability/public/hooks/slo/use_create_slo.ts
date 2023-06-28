/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { encode } from '@kbn/rison';
import type { CreateSLOInput, CreateSLOResponse, FindSLOResponse } from '@kbn/slo-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v1 as uuidv1 } from 'uuid';

import { paths } from '../../routes/paths';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export function useCreateSlo() {
  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    ({ slo }: { slo: CreateSLOInput }) => {
      const body = JSON.stringify(slo);
      return http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
    },
    {
      mutationKey: ['createSlo'],
      onMutate: async ({ slo }) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(sloKeys.lists());

        const latestQueriesData = (
          queryClient.getQueriesData<FindSLOResponse>(sloKeys.lists()) ?? []
        ).at(0);

        const [queryKey, data] = latestQueriesData || [];

        const newItem = { ...slo, id: uuidv1() };
        const optimisticUpdate = {
          ...data,
          results: [...(data?.results ?? []), newItem],
          total: data?.total ? data.total + 1 : 1,
        };

        queryClient.setQueryData(queryKey ?? sloKeys.lists(), optimisticUpdate);

        // Return a context object with the snapshotted value
        return { previousSloList: data };
      },
      onSuccess: (_data, { slo }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.create.successNotification', {
            defaultMessage: 'Successfully created {name}',
            values: { name: slo.name },
          })
        );
        queryClient.invalidateQueries(sloKeys.lists());
      },
      onError: (error, { slo }) => {
        toasts.addError(new Error(String(error)), {
          title: i18n.translate('xpack.observability.slo.create.errorNotification', {
            defaultMessage: 'Something went wrong while creating {name}',
            values: { name: slo.name },
          }),
        });

        navigateToUrl(
          http.basePath.prepend(paths.observability.sloCreateWithEncodedForm(encode(slo)))
        );
      },
    }
  );
}
