/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useMutation } from '@tanstack/react-query';
import { createListItem } from '@kbn/securitysolution-list-api';
import type { CreateListItemParams } from '@kbn/securitysolution-list-api';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useInvalidateListItemQuery } from '../use_find_list_items';

export const CREATE_LIST_ITEM_MUTATION_KEY = ['POST', 'LIST_ITEM_CREATE'];
type CreateListMutationParams = Omit<CreateListItemParams, 'refresh' | 'http'>;

export const useCreateListItemMutation = (
  options?: UseMutationOptions<ListItemSchema, Error, CreateListMutationParams>
) => {
  const http = useKibana().services.http;
  const invalidateListItemQuery = useInvalidateListItemQuery();
  return useMutation<ListItemSchema, Error, CreateListMutationParams>(
    ({ listId, value }) => createListItem({ listId, value, http, refresh: true }),
    {
      ...options,
      mutationKey: CREATE_LIST_ITEM_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateListItemQuery();
        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
