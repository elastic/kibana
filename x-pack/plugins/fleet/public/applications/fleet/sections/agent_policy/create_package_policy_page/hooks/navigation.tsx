/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';

import { useStartServices, useLink, useIntraAppState } from '../../../../hooks';
import type {
  CreatePackagePolicyRouteState,
  PackagePolicy,
  NewPackagePolicy,
  OnSaveQueryParamKeys,
} from '../../../../types';
import type { EditPackagePolicyFrom } from '../types';

import { appendOnSaveQueryParamsToPath } from '../utils';

interface UseCancelParams {
  from: EditPackagePolicyFrom;
  pkgkey: string;
  agentPolicyId?: string;
}

export const useCancelAddPackagePolicy = (params: UseCancelParams) => {
  const { from, pkgkey, agentPolicyId } = params;
  const {
    application: { navigateToApp },
  } = useStartServices();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const { getHref } = useLink();

  const cancelClickHandler = useCallback(
    (ev) => {
      if (routeState?.onCancelNavigateTo) {
        ev.preventDefault();
        navigateToApp(...routeState.onCancelNavigateTo);
      }
    },
    [routeState, navigateToApp]
  );

  const cancelUrl = useMemo(() => {
    if (routeState && routeState.onCancelUrl) {
      return routeState.onCancelUrl;
    }
    return from === 'policy' && agentPolicyId
      ? getHref('policy_details', {
          policyId: agentPolicyId,
        })
      : getHref('integration_details_overview', { pkgkey });
  }, [routeState, from, agentPolicyId, getHref, pkgkey]);

  return { cancelClickHandler, cancelUrl };
};

interface UseOnSaveNavigateParams {
  packagePolicy: NewPackagePolicy;
  routeState?: CreatePackagePolicyRouteState;
  queryParamsPolicyId?: string;
}

export const useOnSaveNavigate = (params: UseOnSaveNavigateParams) => {
  const { packagePolicy, queryParamsPolicyId } = params;
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const doOnSaveNavigation = useRef<boolean>(true);
  const { getPath } = useLink();
  const history = useHistory();

  const {
    application: { navigateToApp },
  } = useStartServices();

  // Detect if user left page
  useEffect(() => {
    return () => {
      doOnSaveNavigation.current = false;
    };
  }, []);

  const onSaveNavigate = useCallback(
    (policy?: PackagePolicy, paramsToApply: OnSaveQueryParamKeys[] = []) => {
      if (!doOnSaveNavigation.current) {
        return;
      }

      const packagePolicyPath = getPath('policy_details', { policyId: packagePolicy.policy_id });
      if (routeState?.onSaveNavigateTo && policy) {
        const [appId, options] = routeState.onSaveNavigateTo;
        if (options?.path) {
          const pathWithQueryString = appendOnSaveQueryParamsToPath({
            // In cases where we want to navigate back to a new/existing policy, we need to override the initial `path`
            // value and navigate to the actual agent policy instead
            path: queryParamsPolicyId ? packagePolicyPath : options.path,
            policy,
            mappingOptions: routeState.onSaveQueryParams,
            paramsToApply,
          });
          navigateToApp(appId, { ...options, path: pathWithQueryString });
        } else {
          navigateToApp(...routeState.onSaveNavigateTo);
        }
      } else {
        history.push(packagePolicyPath);
      }
    },
    [packagePolicy.policy_id, getPath, navigateToApp, history, routeState, queryParamsPolicyId]
  );

  return onSaveNavigate;
};
