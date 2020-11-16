/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useUrlParams } from '../../../../hooks';

export const useSimpleQuery = () => {
  const [getUrlParams, updateUrlParams] = useUrlParams();

  const { query } = getUrlParams();

  const [debouncedValue, setDebouncedValue] = useState(query ?? '');

  useDebounce(
    () => {
      updateUrlParams({ query: debouncedValue });
    },
    250,
    [debouncedValue]
  );

  return { query, setQuery: setDebouncedValue };
};
