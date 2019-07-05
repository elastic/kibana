/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { LicenseApiResponse, loadLicense } from '../../services/rest/xpack';
import { IReduxState } from '../rootReducer';
import { createInitialDataSelector } from './helpers';

const ID = 'license';
const INITIAL_DATA = {
  features: {
    watcher: { is_available: false },
    ml: { is_available: false }
  },
  license: { is_active: false }
};

const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getLicense(state: IReduxState) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function LicenceRequest({
  render
}: {
  render: RRRRender<LicenseApiResponse>;
}) {
  return (
    <Request id={ID} fn={loadLicense} selector={getLicense} render={render} />
  );
}
