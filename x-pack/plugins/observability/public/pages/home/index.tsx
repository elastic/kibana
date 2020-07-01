/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useHistory } from 'react-router-dom';
import { fetchHasData } from '../../data_handler';
import { useFetcher } from '../../hooks/use_fetcher';

export const HomePage = () => {
  const history = useHistory();
  const { data = {} } = useFetcher(() => fetchHasData(), []);

  const values = Object.values(data);
  const hasSomeData = values.length ? values.some((hasData) => hasData) : null;

  if (hasSomeData === true) {
    history.push({ pathname: '/overview' });
  }
  if (hasSomeData === false) {
    history.push({ pathname: '/landing' });
  }

  return <></>;
};
