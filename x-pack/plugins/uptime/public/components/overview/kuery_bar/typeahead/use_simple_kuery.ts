/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useUrlParams } from '../../../../hooks';

export const useSimpleQuery = () => {
  const [getUrlParams, updateUrlParams] = useUrlParams();

  const { query } = getUrlParams();

  const [debouncedValue, setDebouncedValue] = useState(query ?? '');

  useEffect(() => {
    setDebouncedValue(query ?? '');
  }, [query]);

  useDebounce(
    () => {
      updateUrlParams({ query: debouncedValue });
    },
    250,
    [debouncedValue]
  );

  return { query, setQuery: setDebouncedValue };
};
