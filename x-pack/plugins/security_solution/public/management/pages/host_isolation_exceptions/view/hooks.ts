/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CreateExceptionListItemSchema,
  FoundExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useCallback, useEffect, useState } from 'react';
import { QueryObserverResult, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useEndpointPrivileges } from '../../../../common/components/user_privileges/endpoint';
import { useHttp } from '../../../../common/lib/kibana/hooks';
import { State } from '../../../../common/store';
import { ServerApiError } from '../../../../common/types';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE,
} from '../../../common/constants';
import { getHostIsolationExceptionsListPath } from '../../../common/routing';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../../common/utils';
import { SEARCHABLE_FIELDS } from '../constants';
import {
  getHostIsolationExceptionItems,
  getHostIsolationExceptionSummary,
  getOneHostIsolationExceptionItem,
} from '../service';
import { getCurrentLocation } from '../store/selector';
import { HostIsolationExceptionsPageLocation, HostIsolationExceptionsPageState } from '../types';
import { createEmptyHostIsolationException } from '../utils';

export function useHostIsolationExceptionsSelector<R>(
  selector: (state: HostIsolationExceptionsPageState) => R
): R {
  return useSelector((state: State) =>
    selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE]
    )
  );
}

export function useHostIsolationExceptionsNavigateCallback() {
  const location = useHostIsolationExceptionsSelector(getCurrentLocation);
  const history = useHistory();

  return useCallback(
    (args: Partial<HostIsolationExceptionsPageLocation>) =>
      history.push(getHostIsolationExceptionsListPath({ ...location, ...args })),
    [history, location]
  );
}

/**
 * Checks if the current user should be able to see the host isolation exceptions
 * menu item based on their current privileges
 */
export function useCanSeeHostIsolationExceptionsMenu(): boolean {
  const http = useHttp();
  const privileges = useEndpointPrivileges();

  const [canSeeMenu, setCanSeeMenu] = useState(privileges.canIsolateHost);

  useEffect(() => {
    async function checkIfHasExceptions() {
      try {
        const summary = await getHostIsolationExceptionSummary(http);
        if (summary?.total > 0) {
          setCanSeeMenu(true);
        }
      } catch (error) {
        // an error will ocurr if the exception list does not exist
        setCanSeeMenu(false);
      }
    }
    if (!privileges.canIsolateHost) {
      checkIfHasExceptions();
    } else {
      setCanSeeMenu(true);
    }
  }, [http, privileges.canIsolateHost]);

  return canSeeMenu;
}

export function useFetchHostIsolationExceptionsList({
  filter,
  page,
  perPage,
  policies,
  excludedPolicies = [],
  enabled = true,
}: {
  filter?: string;
  page: number;
  perPage: number;
  policies?: string[];
  excludedPolicies?: string[];
  enabled?: boolean;
}): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const http = useHttp();

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['hostIsolationExceptions', 'list', filter, perPage, page, policies, excludedPolicies],
    () => {
      const kql = parsePoliciesAndFilterToKql({
        policies,
        excludedPolicies,
        kuery: filter ? parseQueryFilterToKQL(filter, SEARCHABLE_FIELDS) : undefined,
      });

      return getHostIsolationExceptionItems({
        http,
        page: page + 1,
        perPage,
        filter: kql,
      });
    },
    { enabled, keepPreviousData: true }
  );
}

export function useGetHostIsolationExceptionFormEntry({
  id,
  onSuccess,
  onError,
}: {
  id?: string;
  onSuccess: (data: CreateExceptionListItemSchema | UpdateExceptionListItemSchema) => void;
  onError?: (error: ServerApiError) => void;
}): QueryObserverResult {
  const http = useHttp();
  return useQuery<UpdateExceptionListItemSchema | CreateExceptionListItemSchema, ServerApiError>(
    ['hostIsolationExceptions', 'form', id],
    async () => {
      // for editing, fetch from the API
      if (id !== undefined) {
        return getOneHostIsolationExceptionItem(http, id);
      }
      // for adding, return a new empty object
      return createEmptyHostIsolationException();
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      onSuccess,
      onError,
    }
  );
}
