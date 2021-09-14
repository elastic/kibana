/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';

import { startBasicLicenseStatus, cancelStartBasicLicense } from '../actions/start_basic';

export const startBasicStatus = handleActions(
  {
    [startBasicLicenseStatus](state, { payload }) {
      return payload;
    },
    [cancelStartBasicLicense]() {
      return {};
    },
  },
  {}
);
