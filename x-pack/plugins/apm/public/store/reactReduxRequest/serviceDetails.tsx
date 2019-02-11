/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, get } from 'lodash';
import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ServiceAPIResponse } from 'x-pack/plugins/apm/server/lib/services/get_service';
import { loadServiceDetails } from '../../services/rest/apm/services';
import { IReduxState } from '../rootReducer';
import { createInitialDataSelector } from './helpers';

const ID = 'serviceDetails';
const INITIAL_DATA = { types: [] };
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getServiceDetails(state: IReduxState) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function getDefaultTransactionType(state: IReduxState) {
  const types: string[] = get(state.reactReduxRequest[ID], 'data.types');
  return first(types);
}

export function ServiceDetailsRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<ServiceAPIResponse>;
}) {
  const { serviceName, start, end, kuery } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadServiceDetails}
      args={[{ serviceName, start, end, kuery }]}
      selector={getServiceDetails}
      render={render}
    />
  );
}
