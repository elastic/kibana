/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { ErrorGroupAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_group';
import { loadErrorGroupDetails } from '../../services/rest/apm/error_groups';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
// @ts-ignore
import { createInitialDataSelector } from './helpers';

const ID = 'errorGroupDetails';
const INITIAL_DATA: ErrorGroupAPIResponse = { occurrencesCount: 0 };
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getErrorGroupDetails(state: IReduxState) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ErrorGroupDetailsRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<ErrorGroupAPIResponse>;
}) {
  const { serviceName, errorGroupId, start, end, kuery } = urlParams;

  if (!(serviceName && start && end && errorGroupId)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadErrorGroupDetails}
      args={[{ serviceName, start, end, errorGroupId, kuery }]}
      selector={getErrorGroupDetails}
      render={render}
    />
  );
}
