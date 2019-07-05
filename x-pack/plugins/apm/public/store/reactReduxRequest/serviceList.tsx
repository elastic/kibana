/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender, RRRRenderResponse } from 'react-redux-request';
import { ServiceListAPIResponse } from 'x-pack/plugins/apm/server/lib/services/get_services';
import { loadServiceList } from '../../services/rest/apm/services';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
import { createInitialDataSelector } from './helpers';

const ID = 'serviceList';
const INITIAL_DATA: ServiceListAPIResponse = [];
const withInitialData = createInitialDataSelector<ServiceListAPIResponse>(
  INITIAL_DATA
);

export function getServiceList(
  state: IReduxState
): RRRRenderResponse<ServiceListAPIResponse> {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ServiceListRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<ServiceListAPIResponse>;
}) {
  const { start, end, kuery } = urlParams;

  if (!(start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadServiceList}
      args={[{ start, end, kuery }]}
      selector={getServiceList}
      render={render}
    />
  );
}
