/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import type { PrivilegesAndCapabilities } from '../../../common/privilege/has_privilege_factory';
import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

export const useCanDeleteIndex = () => {
  const { http } = useAppDependencies();

  return useQuery<boolean, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.CAN_DELETE_INDEX],
    async ({ signal }) => {
      const resp = await http.get<PrivilegesAndCapabilities>(addInternalBasePath('privileges'), {
        version: '1',
        signal,
      });
      if (!resp) {
        return false;
      }
      return resp.privileges.hasAllPrivileges;
    }
  );
};
