/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { FunctionKeys } from 'utility-types';
import type { SavedObjectsFindOptions, SimpleSavedObject } from '@kbn/core/public';
import { NewPackagePolicy, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import {
  getBenchmarkFromPackagePolicy,
  getBenchmarkTypeFilter,
} from '../../../common/utils/helpers';
import { CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { CspRuleTemplate } from '../../../common/schemas';
import { useKibana } from '../../common/hooks/use_kibana';

export type RuleSavedObject = Omit<
  SimpleSavedObject<CspRuleTemplate>,
  FunctionKeys<SimpleSavedObject>
>;

export type RulesQuery = Required<
  Pick<SavedObjectsFindOptions, 'search' | 'page' | 'perPage' | 'filter'>
>;
export type RulesQueryResult = ReturnType<typeof useFindCspRules>;

export const useFindCspRules = (
  { search, page, perPage, filter }: RulesQuery,
  packagePolicyId: string
) => {
  const { savedObjects } = useKibana().services;

  return useQuery([CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE, { search, page, perPage }], () =>
    savedObjects.client
      .get<NewPackagePolicy>(PACKAGE_POLICY_SAVED_OBJECT_TYPE, packagePolicyId)
      .then((res) => {
        const benchmarkId = getBenchmarkFromPackagePolicy(res.attributes.inputs);

        return savedObjects.client.find<CspRuleTemplate>({
          type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          search: search ? `"${search}"*` : '',
          searchFields: ['metadata.name.text'],
          page: 1,
          sortField: 'metadata.name',
          perPage,
          filter: getBenchmarkTypeFilter(benchmarkId),
        });
      })
  );
};
