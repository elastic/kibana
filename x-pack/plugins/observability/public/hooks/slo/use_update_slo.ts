/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { FindSLOResponse, UpdateSLOInput, UpdateSLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { encode } from '@kbn/rison';
import { useKibana } from '../../utils/kibana_react';
import { paths } from '../../../common/locators/paths';
import { sloKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUpdateSlo() {
  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    UpdateSLOResponse,
    ServerError,
    { sloId: string; slo: UpdateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey; sloId: string }
  >(
    ['updateSlo'],
    ({ sloId, slo }) => {
      const body = JSON.stringify(slo);
      return http.put<UpdateSLOResponse>(`/api/observability/slos/${sloId}`, { body });
    },
    {
      onMutate: async ({ sloId, slo }) => {
        await queryClient.cancelQueries({ queryKey: sloKeys.lists(), exact: false });

        const queriesData = queryClient.getQueriesData<FindSLOResponse>({
          queryKey: sloKeys.lists(),
          exact: false,
        });
        const [queryKey, previousData] = queriesData?.at(0) ?? [];

        const updatedItem = { ...slo, id: sloId };
        const optimisticUpdate = {
          page: previousData?.page ?? 1,
          perPage: previousData?.perPage ?? 25,
          total: previousData?.total ? previousData.total : 1,
          results: [
            ...(previousData?.results?.filter((result) => result.id !== sloId) ?? []),
            updatedItem,
          ],
        };

        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        return { previousData, queryKey, sloId };
      },
      onSuccess: (_data, { slo: { name } }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.update.successNotification', {
            defaultMessage: 'Successfully updated {name}',
            values: { name },
          })
        );

        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });
      },
      onError: (error, { slo }, context) => {
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }

        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.observability.slo.update.errorNotification', {
            defaultMessage: 'Something went wrong when updating {name}',
            values: { name: slo.name },
          }),
        });

        if (context?.sloId) {
          navigateToUrl(
            http.basePath.prepend(
              paths.observability.sloEditWithEncodedForm(context.sloId, encode(slo))
            )
          );
        }
      },
    }
  );
}
