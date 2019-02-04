/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { STATUS } from '../../../../constants/index';
import { LicenceRequest } from '../../../../store/reactReduxRequest/license';
import { Redirect, withRouter } from 'react-router-dom';

const INVALID_LICENSE_PATH = '/invalid-license';

function AccessControlComponent({ location, children }) {
  if (location.pathname === INVALID_LICENSE_PATH) {
    return children;
  }
  return (
    <LicenceRequest
      render={({ data, status }) => {
        if (status === STATUS.LOADING) {
          return null;
        }
        if (status === STATUS.SUCCESS && !data.license.is_activexxxxx) {
          return <Redirect to={INVALID_LICENSE_PATH} />;
        }
        return children;
      }}
    />
  );
}

export const AccessControl = withRouter(AccessControlComponent);
