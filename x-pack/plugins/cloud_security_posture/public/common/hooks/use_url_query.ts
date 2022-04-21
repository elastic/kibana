/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { decodeQuery, encodeQuery } from '../navigation/query_utils';

/**
 * @description uses 'rison' to encode/decode a url query
 * @todo replace getDefaultQuery with schema. validate after decoded from URL, use defaultValues
 * @note shallow-merges default, current and next query
 */
export const useUrlQuery = <T extends object>(getDefaultQuery: () => T) => {
  const { push } = useHistory();
  const { search, key } = useLocation();

  const urlQuery = useMemo(
    () => ({ ...getDefaultQuery(), ...decodeQuery<T>(search) }),
    [getDefaultQuery, search]
  );

  const setUrlQuery = useCallback(
    (query: Partial<T>) =>
      push({
        search: encodeQuery({ ...getDefaultQuery(), ...urlQuery, ...query }),
      }),
    [getDefaultQuery, urlQuery, push]
  );

  // Set initial query
  useEffect(() => {
    // TODO: condition should be if decoding failed
    if (search) return;

    setUrlQuery(getDefaultQuery());
  }, [getDefaultQuery, search, setUrlQuery]);

  return {
    key,
    urlQuery,
    setUrlQuery,
  };
};
