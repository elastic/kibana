/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { makeMapStateToProps } from '../url_state/helpers';
import { getSearch } from './helpers';
import { SearchNavTab } from './types';

export const useGetUrlSearch = (tab: SearchNavTab) => {
  const mapState = makeMapStateToProps();
  const { urlState } = useSelector(mapState, isEqual);
  const urlSearch = useMemo(() => getSearch(tab, urlState), [tab, urlState]);
  return urlSearch;
};
