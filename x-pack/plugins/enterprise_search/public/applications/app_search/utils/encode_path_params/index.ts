/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';

export const encodePathParams = (pathParams: Record<string, string | number>) => {
  const encodedParams: Record<string, string> = {};

  Object.entries(pathParams).map(([key, value]) => {
    encodedParams[key] = encodeURIComponent(value);
  });

  return encodedParams;
};

export const useDecodedParams = () => {
  const decodedParams: Record<string, string> = {};

  const params = useParams();
  Object.entries(params).map(([key, value]) => {
    decodedParams[key] = decodeURIComponent(value as string);
  });

  return decodedParams;
};
