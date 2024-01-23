/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';

export const GROUPINGS_SEARCH_PARAM = 'groupings';

const decodeFromBase64 = (str: string) => Buffer.from(str, 'base64').toString('utf8');

export function useGetGroupingsQueryParam():
  | { encodedGroupings: string; groupings: Record<string, unknown> }
  | undefined {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);

  const groupings = searchParams.get(GROUPINGS_SEARCH_PARAM);
  const decodedGroupings = decodeFromBase64(groupings);

  return Object.keys(groupings).length
    ? {
        encodedGroupings: groupings,
        groupings: decodedGroupings,
      }
    : {};
}
