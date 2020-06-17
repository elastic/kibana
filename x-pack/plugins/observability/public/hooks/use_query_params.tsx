/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useLocation } from 'react-router-dom';

export function useQueryParams<T = {}>(): T {
  const urlSearchParms = new URLSearchParams(useLocation().search);
  const params: Record<string, string> = {};
  urlSearchParms.forEach((value, key) => {
    params[key] = value;
  });
  // TODO: check it later
  return (params as unknown) as T;
}
