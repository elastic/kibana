/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { encode } from '@kbn/rison';
import type { CreateSLOInput, CreateSLOResponse, FindSLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { v1 as uuidv1 } from 'uuid';
import { paths } from '../../../common/locators/paths';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export function useCreateSlo() {
  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    CreateSLOResponse,
    string,
    { slo: CreateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['createSlo'],
    ({ slo }) => {
      const body = JSON.stringify(slo);
      return http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
    },
    {
      onMutate: async ({ slo }) => {
        await queryClient.cancelQueries({ queryKey: sloKeys.lists(), exact: false });

        const queriesData = queryClient.getQueriesData<FindSLOResponse>({
          queryKey: sloKeys.lists(),
          exact: false,
        });

        const [queryKey, previousData] = queriesData?.at(0) ?? [];

        const newItem = { ...slo, id: uuidv1(), summary: undefined };

        const optimisticUpdate = {
          page: previousData?.page ?? 1,
          perPage: previousData?.perPage ?? 25,
          total: previousData?.total ? previousData.total + 1 : 1,
          results: [...(previousData?.results ?? []), newItem],
        };

        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        return { queryKey, previousData };
      },
      onSuccess: (_data, { slo }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.create.successNotification', {
            defaultMessage: 'Successfully created {name}',
            values: { name: slo.name },
          })
        );
      },
      onError: (error, { slo }, context) => {
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }

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
