/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request } from 'react-redux-request';
import { loadErrorDistribution } from '../../services/rest/apm';
import { createInitialDataSelector } from './helpers';

const ID = 'errorDistribution';
const INITIAL_DATA = { buckets: [], totalHits: 0 };
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getErrorDistribution(state) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ErrorDistributionRequest({ urlParams, render }) {
  const { serviceName, start, end, errorGroupId, kuery } = urlParams;

  if (!(serviceName && start && end && errorGroupId)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadErrorDistribution}
      args={[{ serviceName, start, end, errorGroupId, kuery }]}
      selector={getErrorDistribution}
      render={render}
    />
  );
}
