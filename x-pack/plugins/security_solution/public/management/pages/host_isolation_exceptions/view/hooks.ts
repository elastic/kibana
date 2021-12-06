/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { QueryObserverResult, useQuery } from 'react-query';
import { ServerApiError } from '../../../../common/types';
import { useHttp } from '../../../../common/lib/kibana/hooks';
import { useEndpointPrivileges } from '../../../../common/components/user_privileges/endpoint';
import { State } from '../../../../common/store';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE,
} from '../../../common/constants';
import { getHostIsolationExceptionsListPath } from '../../../common/routing';
import { getHostIsolationExceptionItems, getHostIsolationExceptionSummary } from '../service';
import { getCurrentLocation } from '../store/selector';
import { HostIsolationExceptionsPageLocation, HostIsolationExceptionsPageState } from '../types';
import { parseQueryFilterToKQL } from '../../../common/utils';

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

const SEARCHABLE_FIELDS: Readonly<string[]> = [`name`, `description`, `entries.value`];

export function useFetchHostIsolationExceptionsList(): QueryObserverResult<
  FoundExceptionListItemSchema,
  ServerApiError
> {
  const http = useHttp();
  const location = useHostIsolationExceptionsSelector(getCurrentLocation);

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['hostIsolationExceptions', 'list', location.filter, location.page_size, location.page_index],
    () => {
      return getHostIsolationExceptionItems({
        http,
        page: location.page_index + 1,
        perPage: location.page_size,
        filter: parseQueryFilterToKQL(location.filter, SEARCHABLE_FIELDS) || undefined,
      });
    }
  );
}
