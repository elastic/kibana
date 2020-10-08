/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { fetchHasData } from '../../data_handler';
import { useFetcher } from '../../hooks/use_fetcher';
import { useQueryParams } from '../../hooks/use_query_params';
import { LoadingObservability } from '../overview/loading_observability';

export function HomePage() {
  const history = useHistory();

  const { absStart, absEnd } = useQueryParams();

  const { data = {} } = useFetcher(
    () => fetchHasData({ start: absStart, end: absEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const values = Object.values(data);
  const hasSomeData = values.length ? values.some((hasData) => hasData) : null;

  useEffect(() => {
    if (hasSomeData === true) {
      history.push({ pathname: '/overview' });
    }
    if (hasSomeData === false) {
      history.push({ pathname: '/landing' });
    }
  }, [hasSomeData, history]);

  return <LoadingObservability />;
}
