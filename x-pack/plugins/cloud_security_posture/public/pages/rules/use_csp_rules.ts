/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FunctionKeys } from 'utility-types';
import type { SavedObjectsFindOptions, SimpleSavedObject } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  UPDATE_RULES_CONFIG_ROUTE_PATH,
  CSP_RULE_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { CspRule } from '../../../common/schemas';
import { useKibana } from '../../common/hooks/use_kibana';

export type RuleSavedObject = Omit<SimpleSavedObject<CspRule>, FunctionKeys<SimpleSavedObject>>;

export type RulesQuery = Required<
  Pick<SavedObjectsFindOptions, 'search' | 'page' | 'perPage' | 'filter'>
>;
export type RulesQueryResult = ReturnType<typeof useFindCspRules>;

export const useFindCspRules = ({ search, page, perPage, filter }: RulesQuery) => {
  const { savedObjects } = useKibana().services;

  return useQuery([CSP_RULE_SAVED_OBJECT_TYPE, { search, page, perPage }], () =>
    savedObjects.client.find<CspRule>({
      type: CSP_RULE_SAVED_OBJECT_TYPE,
      search: search ? `"${search}"*` : '',
      searchFields: ['metadata.name.text'],
      page: 1,
      sortField: 'metadata.name',
      perPage,
      filter,
    })
  );
};

const UPDATE_FAILED_TEXT = i18n.translate('xpack.csp.rules.rulesErrorToast.updateFailedTitle', {
  defaultMessage: 'Update failed',
});

export const useBulkUpdateCspRules = () => {
  const { notifications, http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    async ({
      savedObjectRules,
      packagePolicyId,
    }: {
      savedObjectRules: RuleSavedObject[];
      packagePolicyId: CspRule['package_policy_id'];
    }) =>
      http.post(UPDATE_RULES_CONFIG_ROUTE_PATH, {
        body: JSON.stringify({
          package_policy_id: packagePolicyId,
          rules: savedObjectRules.map((savedObjectRule) => ({
            id: savedObjectRule.id,
            enabled: savedObjectRule.attributes.enabled,
          })),
        }),
      }),
    {
      onError: (err) => {
        if (err instanceof Error) notifications.toasts.addError(err, { title: UPDATE_FAILED_TEXT });
        else notifications.toasts.addDanger(UPDATE_FAILED_TEXT);
      },
      onSettled: () =>
        // Invalidate all queries for simplicity
        queryClient.invalidateQueries([CSP_RULE_SAVED_OBJECT_TYPE]),
    }
  );
};
