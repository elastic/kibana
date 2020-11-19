/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback } from 'react';
import { OverviewPageComponent } from '../../pages/overview';
import { selectIndexPattern } from '../../state/selectors';
import { setEsKueryString } from '../../state/actions';

export const OverviewPage: React.FC = (props) => {
  const dispatch = useDispatch();

  const setEsKueryFilters = useCallback(
    (esFilters: string) => dispatch(setEsKueryString(esFilters)),
    [dispatch]
  );
  const { index_pattern: indexPattern, loading } = useSelector(selectIndexPattern);

  return (
    <OverviewPageComponent
      setEsKueryFilters={setEsKueryFilters}
      indexPattern={indexPattern}
      loading={loading}
      {...props}
    />
  );
};
