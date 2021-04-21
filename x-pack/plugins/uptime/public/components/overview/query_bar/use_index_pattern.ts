/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getIndexPattern } from '../../../state/actions';
import { selectIndexPattern } from '../../../state/selectors';
import { SyntaxType } from './use_query_bar';

export const useIndexPattern = (queryLanguage?: string) => {
  const dispatch = useDispatch();
  const indexPattern = useSelector(selectIndexPattern);

  useEffect(() => {
    // we only use index pattern for kql queries
    if (!indexPattern.index_pattern && (!queryLanguage || queryLanguage === SyntaxType.kuery)) {
      dispatch(getIndexPattern());
    }
  }, [indexPattern.index_pattern, dispatch, queryLanguage]);

  return indexPattern;
};
