/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSearchTextAction } from '../state/actions';
import { searchTextSelector } from '../state/selectors';

export const useSearchText = () => {
  const dispatch = useDispatch();
  const searchText = useSelector(searchTextSelector);

  const updateSearchText = useCallback(
    (nextSearchText: string) => dispatch(setSearchTextAction(nextSearchText)),
    [dispatch]
  );

  return { searchText, updateSearchText };
};
