/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FunctionKeys } from 'utility-types';
import type { SavedObjectsFindOptions, SimpleSavedObject } from '@kbn/core/public';
import {
  UPDATE_RULES_CONFIG_ROUTE_PATH,
  cspRuleAssetSavedObjectType,
} from '../../../common/constants';
import type { CspRuleSchema } from '../../../common/schemas/csp_rule';
import { useKibana } from '../../common/hooks/use_kibana';
import { UPDATE_FAILED } from './translations';
import { useCurrentUser } from '@kbn/cases-plugin/public/common/lib/kibana';

export type RuleSavedObject = Omit<
  SimpleSavedObject<CspRuleSchema>,
  FunctionKeys<SimpleSavedObject>
>;

export type RulesQuery = Required<
  Pick<SavedObjectsFindOptions, 'search' | 'page' | 'perPage' | 'filter'>
>;
export type RulesQueryResult = ReturnType<typeof useFindCspRules>;

export const useFindCspRules = ({ search, page, perPage, filter }: RulesQuery) => {
  const { savedObjects } = useKibana().services;

  return useQuery([cspRuleAssetSavedObjectType, { search, page, perPage }], () =>
    savedObjects.client.find<CspRuleSchema>({
      type: cspRuleAssetSavedObjectType,
      search,
      searchFields: ['name'],
      page: 1,
      // NOTE: 'name.raw' is a field mapping we defined on 'name'
      sortField: 'name.raw',
      perPage,
      filter,
    })
  );
};

export const useBulkUpdateCspRules = () => {
  const { savedObjects, notifications, http } = useKibana().services;
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation(
    async ({
      savedObjectRules,
      packagePolicyId,
    }: {
      savedObjectRules: RuleSavedObject[];
      packagePolicyId: CspRuleSchema['package_policy_id'];
    }) => {
      await savedObjects.client.bulkUpdate<RuleSavedObject>(
        savedObjectRules.map((savedObjectRule) => ({
          type: cspRuleAssetSavedObjectType,
          id: savedObjectRule.id,
          attributes: savedObjectRule.attributes,
        }))
      );
      await http.post(UPDATE_RULES_CONFIG_ROUTE_PATH, {
        body: JSON.stringify({
          package_policy_id: packagePolicyId,
          user,
        }),
      });
    },
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
