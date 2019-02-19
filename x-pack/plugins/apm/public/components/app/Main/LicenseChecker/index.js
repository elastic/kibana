/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { STATUS } from '../../../../constants/index';
import { LicenceRequest } from '../../../../store/reactReduxRequest/license';

function LicenseChecker() {
  return (
    <LicenceRequest
      render={({ data, status }) => {
        if (status === STATUS.SUCCESS && !data.license.is_active) {
          window.location = '#/invalid-license';
        }
        return null;
      }}
    />
  );
}

export default LicenseChecker;
