/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { getMLJob, MLJobApiResponse } from '../../services/rest/ml';
import { IReduxState } from '../rootReducer';
import { createInitialDataSelector } from './helpers';

const INITIAL_DATA = { count: 0, jobs: [] };
const withInitialData = createInitialDataSelector(INITIAL_DATA);
const ID = 'MLJobs';

function selectMlJobs(state: IReduxState) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function MLJobsRequest({
  serviceName,
  transactionType = '*',
  render
}: {
  serviceName: string;
  transactionType?: string;
  render: RRRRender<MLJobApiResponse>;
}) {
  return (
    <Request
      id={ID}
      fn={getMLJob}
      args={[{ serviceName, transactionType }]}
      render={render}
      selector={selectMlJobs}
    />
  );
}
