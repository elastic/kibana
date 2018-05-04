/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withInitialData } from './selectorHelpers';
import { ReduxRequest } from '../components/shared/ReduxRequest';
import { loadErrorGroupDetails } from '../services/rest';

const ID = 'errorGroupDetails';
const INITIAL_DATA = {};

export function getErrorGroupDetails(state) {
  return withInitialData(state.reduxRequest[ID], INITIAL_DATA);
}

export function ErrorGroupDetailsRequest({ urlParams, render }) {
  const { serviceName, errorGroupId, start, end, kuery } = urlParams;

  return (
    <ReduxRequest
      id={ID}
      fn={loadErrorGroupDetails}
      shouldInvoke={Boolean(serviceName && start && end && errorGroupId)}
      args={[{ serviceName, start, end, errorGroupId, kuery }]}
      selector={getErrorGroupDetails}
      render={render}
    />
  );
}
