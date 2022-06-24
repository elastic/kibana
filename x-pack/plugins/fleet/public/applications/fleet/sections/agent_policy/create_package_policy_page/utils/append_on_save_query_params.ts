/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreatePackagePolicyRouteState,
  OnSaveQueryParamOpts,
  PackagePolicy,
  OnSaveQueryParamKeys,
} from '../../../../types';

export function appendOnSaveQueryParamsToPath({
  path,
  policy,
  paramsToApply,
  mappingOptions = {},
}: {
  path: string;
  policy: PackagePolicy;
  paramsToApply: OnSaveQueryParamKeys[];
  mappingOptions?: CreatePackagePolicyRouteState['onSaveQueryParams'];
}) {
  const [basePath, queryStringIn] = path.split('?');
  const queryParams = Object.fromEntries(new URLSearchParams(queryStringIn));

  paramsToApply.forEach((paramName) => {
    const paramOptions = mappingOptions[paramName];
    if (paramOptions) {
      const [paramKey, paramValue] = createQueryParam(paramName, paramOptions, policy.policy_id);
      if (paramKey && paramValue) {
        queryParams[paramKey] = paramValue;
      }
    }
  });

  const queryString = new URLSearchParams(queryParams).toString();

  return basePath + (queryString ? `?${queryString}` : '');
}

function createQueryParam(
  name: string,
  opts: OnSaveQueryParamOpts,
  policyId: string
): [string?, string?] {
  if (!opts) {
    return [];
  }
  if (typeof opts === 'boolean' && opts) {
    return [name, 'true'];
  }

  const paramKey = opts.renameKey ? opts.renameKey : name;
  const paramValue = opts.policyIdAsValue ? policyId : 'true';

  return [paramKey, paramValue];
}
