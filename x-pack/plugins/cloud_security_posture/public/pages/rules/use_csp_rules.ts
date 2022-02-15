/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cspRuleAssetSavedObjectType, type CspRuleSchema } from '../../../common/schemas/csp_rule';
import type {
  SavedObjectsBatchResponse,
  SavedObjectsFindOptions,
} from '../../../../../../src/core/public';
import { useKibana } from '../../common/hooks/use_kibana';

export type UseCspRulesOptions = Pick<
  SavedObjectsFindOptions,
  'search' | 'searchFields' | 'page' | 'perPage'
>;

export const useFindCspRules = ({
  search,
  searchFields,
  page = 1,
  perPage = 10,
}: UseCspRulesOptions) => {
  const { savedObjects } = useKibana().services;
  return useQuery(
    [cspRuleAssetSavedObjectType, { search, searchFields, page, perPage }],
    () =>
      savedObjects.client.find<CspRuleSchema>({
        type: cspRuleAssetSavedObjectType,
        search,
        searchFields,
        page,
        // NOTE: 'name.raw' is a field maping we defined on 'name' so it'd also be sortable
        // TODO: this needs to be shared or removed
        sortField: 'name.raw',
        perPage,
      }),
    { refetchOnWindowFocus: false }
  );
};

export const useBulkUpdateCspRules = () => {
  const { savedObjects } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    (rules: CspRuleSchema[]) =>
      savedObjects.client.bulkUpdate(
        rules.map((rule) => ({
          type: cspRuleAssetSavedObjectType,
          id: rule.id,
          attributes: rule,
        }))
        // TODO: fix bulkUpdate types in core
      ) as Promise<SavedObjectsBatchResponse<CspRuleSchema>>,
    {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: cspRuleAssetSavedObjectType,
          exact: false,
        }),
    }
  );
};
