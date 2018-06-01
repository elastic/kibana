/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withInitialData } from './helpers';
import { Request } from 'react-redux-request';
import { loadErrorGroupDetails } from '../../services/rest';

const ID = 'errorGroupDetails';
const INITIAL_DATA = {};

export function getErrorGroupDetails(state) {
  return withInitialData(state.reactReduxRequest[ID], INITIAL_DATA);
}

export function ErrorGroupDetailsRequest({ urlParams, render }) {
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
