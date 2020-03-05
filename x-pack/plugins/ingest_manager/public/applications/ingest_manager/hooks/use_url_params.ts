/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLocation } from 'react-router-dom';
import { parse } from 'query-string';
import { useEffect, useState } from 'react';

/**
 * Parses `search` params and returns an object with them. Object will be recreated
 * every time `search` changes.
 */
export function useUrlParams() {
  const { search } = useLocation();
  const [urlParams, setUrlParams] = useState(() => parse(search));
  useEffect(() => {
    setUrlParams(parse(search));
  }, [search]);
  return urlParams;
}
