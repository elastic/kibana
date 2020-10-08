/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getIndexPattern } from '../../../state/actions';
import { selectIndexPattern } from '../../../state/selectors';

export const useIndexPattern = () => {
  const dispatch = useDispatch();
  const indexPattern = useSelector(selectIndexPattern);

  useEffect(() => {
    if (!indexPattern.index_pattern) {
      dispatch(getIndexPattern());
    }
  }, [indexPattern.index_pattern, dispatch]);

  return indexPattern;
};
