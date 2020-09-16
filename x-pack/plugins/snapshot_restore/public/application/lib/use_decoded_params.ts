/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
import { attemptToURIDecode } from './attempt_to_uri_decode';

export const useDecodedParams = <
  Params extends { [K in keyof Params]?: string } = {}
>(): Params => {
  const params = useParams<Record<string, string>>();
  const decodedParams = {} as Params;

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      (decodedParams as any)[key] = attemptToURIDecode(value);
    }
  }

  return decodedParams;
};
