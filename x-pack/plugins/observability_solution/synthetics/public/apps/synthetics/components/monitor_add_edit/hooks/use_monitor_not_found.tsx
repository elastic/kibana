/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useGetUrlParams, useUrlParams } from '../../../hooks';
import { IHttpSerializedFetchError } from '../../../state';

export const useMonitorNotFound = (error?: IHttpSerializedFetchError | null, id?: string) => {
  const { packagePolicyId } = useGetUrlParams();
  const updateUrlParams = useUrlParams()[1];

  useEffect(() => {
    if (id && packagePolicyId && !error) {
      updateUrlParams({ packagePolicyId: undefined }, true);
    }
  }, [error, id, packagePolicyId, updateUrlParams]);

  if (!error) return null;
  return error.body?.statusCode === 404;
};
