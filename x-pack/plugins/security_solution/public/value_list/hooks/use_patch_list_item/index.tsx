/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useMutation } from '@tanstack/react-query';
import type { PatchListItemParams } from '@kbn/securitysolution-list-api';
import { patchListItem } from '@kbn/securitysolution-list-api';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useInvalidateListItemQuery } from '../use_find_list_items';

export const PATCH_LIST_ITEM_MUTATION_KEY = ['PATCH', 'LIST_ITEM_MUTATION'];
type PatchListMutationParams = Omit<PatchListItemParams, 'refresh' | 'http'>;

export const usePatchListItemMutation = (
  options?: UseMutationOptions<ListItemSchema, Error, PatchListMutationParams>
) => {
  const http = useKibana().services.http;
  const invalidateListItemQuery = useInvalidateListItemQuery();
  return useMutation<ListItemSchema, Error, PatchListMutationParams>(
    ({ id, value, _version, signal }: PatchListMutationParams) =>
      patchListItem({ id, value, http, refresh: true, _version, signal }),
    {
      ...options,
      mutationKey: PATCH_LIST_ITEM_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateListItemQuery();
        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
