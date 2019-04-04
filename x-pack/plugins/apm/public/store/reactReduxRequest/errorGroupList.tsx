/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { ErrorGroupListAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_groups';
import { loadErrorGroupList } from '../../services/rest/apm/error_groups';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
import { createInitialDataSelector } from './helpers';

const ID = 'errorGroupList';
const INITIAL_DATA: ErrorGroupListAPIResponse = [];
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getErrorGroupList(state: IReduxState) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ErrorGroupOverviewRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<ErrorGroupListAPIResponse>;
}) {
  const {
    serviceName,
    start,
    end,
    sortField,
    sortDirection,
    kuery
  } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadErrorGroupList}
      args={[{ serviceName, start, end, sortField, sortDirection, kuery }]}
      selector={getErrorGroupList}
      render={render}
    />
  );
}
