/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withInitialData } from './helpers';
import { ReduxRequest } from '../../components/shared/ReduxRequest';
import { loadErrorGroupList } from '../../services/rest';

const ID = 'errorGroupList';
const INITIAL_DATA = [];

export function getErrorGroupList(state) {
  return withInitialData(state.reduxRequest[ID], INITIAL_DATA);
}

export function ErrorGroupDetailsRequest({ urlParams, render }) {
  const { serviceName, start, end, q, sortBy, sortOrder, kuery } = urlParams;

  return (
    <ReduxRequest
      id={ID}
      fn={loadErrorGroupList}
      shouldInvoke={Boolean(serviceName && start && end)}
      args={[{ serviceName, start, end, q, sortBy, sortOrder, kuery }]}
      selector={getErrorGroupList}
      render={render}
    />
  );
}
