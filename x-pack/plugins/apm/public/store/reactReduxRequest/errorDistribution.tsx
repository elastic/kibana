/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { ErrorDistributionAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/distribution/get_distribution';
import { loadErrorDistribution } from '../../services/rest/apm/error_groups';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
// @ts-ignore
import { createInitialDataSelector } from './helpers';

const ID = 'errorDistribution';
const INITIAL_DATA: ErrorDistributionAPIResponse = {
  buckets: [],
  totalHits: 0,
  bucketSize: 0
};
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getErrorDistribution(state: IReduxState) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ErrorDistributionRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<ErrorDistributionAPIResponse>;
}) {
  const { serviceName, start, end, errorGroupId, kuery } = urlParams;

  if (!(serviceName && start && end)) {
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
