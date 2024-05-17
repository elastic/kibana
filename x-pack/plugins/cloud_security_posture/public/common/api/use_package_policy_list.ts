/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
  SO_SEARCH_LIMIT,
  packagePolicyRouteService,
} from '@kbn/fleet-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { DETECTION_RULE_RULES_API_CURRENT_VERSION } from '../../../common/constants';

interface PackagePolicyListData {
  items: PackagePolicy[];
}

const PACKAGE_POLICY_LIST_QUERY_KEY = ['packagePolicyList'];

export const usePackagePolicyList = (packageInfoName: string, { enabled = true }) => {
  const { http } = useKibana<CoreStart>().services;

  const query = useQuery<PackagePolicyListData, Error>(
    PACKAGE_POLICY_LIST_QUERY_KEY,
    async () => {
      try {
        const res = await http.get<PackagePolicyListData>(packagePolicyRouteService.getListPath(), {
          version: DETECTION_RULE_RULES_API_CURRENT_VERSION,
          query: {
            perPage: SO_SEARCH_LIMIT,
            page: 1,
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageInfoName}`,
          },
        });

        return res;
      } catch (error: any) {
        throw new Error(`Failed to fetch package policy list: ${error.message}`);
      }
    },
    {
      enabled,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  return query;
};
