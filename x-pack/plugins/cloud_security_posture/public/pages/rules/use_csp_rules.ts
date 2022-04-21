/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FunctionKeys } from 'utility-types';
import type { SavedObjectsFindOptions, SimpleSavedObject } from '@kbn/core/public';
import { cspRuleAssetSavedObjectType, type CspRuleSchema } from '../../../common/schemas/csp_rule';
import { useKibana } from '../../common/hooks/use_kibana';
import { UPDATE_FAILED } from './translations';

export type RuleSavedObject = Omit<
  SimpleSavedObject<CspRuleSchema>,
  FunctionKeys<SimpleSavedObject>
>;

export type RulesQuery = Required<Pick<SavedObjectsFindOptions, 'search' | 'page' | 'perPage'>>;
export type RulesQueryResult = ReturnType<typeof useFindCspRules>;

export const useFindCspRules = ({ search, page, perPage }: RulesQuery) => {
  const { savedObjects } = useKibana().services;
  return useQuery(
    [cspRuleAssetSavedObjectType, { search, page, perPage }],
    () =>
      savedObjects.client.find<CspRuleSchema>({
        type: cspRuleAssetSavedObjectType,
        search,
        searchFields: ['name'],
        page: 1,
        // NOTE: 'name.raw' is a field mapping we defined on 'name'
        sortField: 'name.raw',
        perPage,
      }),
    { refetchOnWindowFocus: false }
  );
};

export const useBulkUpdateCspRules = () => {
  const { savedObjects, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    (rules: CspRuleSchema[]) =>
      savedObjects.client.bulkUpdate<CspRuleSchema>(
        rules.map((rule) => ({
          type: cspRuleAssetSavedObjectType,
          id: rule.id,
          attributes: rule,
        }))
      ),
    {
      onError: (err) => {
        if (err instanceof Error) notifications.toasts.addError(err, { title: UPDATE_FAILED });
        else notifications.toasts.addDanger(UPDATE_FAILED);
      },
      onSettled: () =>
        // Invalidate all queries for simplicity
        queryClient.invalidateQueries({
          queryKey: cspRuleAssetSavedObjectType,
          exact: false,
        }),
    }
  );
};
