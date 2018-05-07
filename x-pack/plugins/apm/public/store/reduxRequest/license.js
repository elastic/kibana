/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { withInitialData } from './helpers';
import { ReduxRequest } from '../../components/shared/ReduxRequest';
import { loadLicense } from '../../services/rest';

const ID = 'license';
const INITIAL_DATA = {
  features: { watcher: { isAvailable: false } },
  license: { isActive: false }
};

export function getLicense(state) {
  return withInitialData(state.reduxRequest[ID], INITIAL_DATA);
}

export function LicenceRequest({ render }) {
  return (
    <ReduxRequest
      id={ID}
      fn={loadLicense}
      selector={getLicense}
      render={render}
    />
  );
}
