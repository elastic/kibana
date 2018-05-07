/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReduxRequest } from '../../components/shared/ReduxRequest';
import { loadErrorDistribution } from '../../services/rest';
import { withInitialData } from './helpers';

const ID = 'errorDistribution';
const INITIAL_DATA = { buckets: [], totalHits: 0 };

export function getErrorDistribution(state) {
  return withInitialData(state.reduxRequest[ID], INITIAL_DATA);
}

export function ErrorDistributionRequest({ urlParams, render }) {
  const { serviceName, start, end, errorGroupId, kuery } = urlParams;

  return (
    <ReduxRequest
      id={ID}
      fn={loadErrorDistribution}
      shouldInvoke={Boolean(serviceName, start, end, errorGroupId)}
      args={[{ serviceName, start, end, errorGroupId, kuery }]}
      selector={getErrorDistribution}
      render={render}
    />
  );
}
