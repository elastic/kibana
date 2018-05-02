/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { STATUS } from '../../../constants';
import ErrorHandler from './view';
import { getDisplayName } from '../HOCUtils';
import { isEmpty } from 'lodash';

function withErrorHandler(WrappedComponent, dataNames) {
  function HOC(props) {
    const unavailableNames = dataNames.filter(
      name => props[name].status === STATUS.FAILURE
    );

    if (!isEmpty(unavailableNames)) {
      return <ErrorHandler names={unavailableNames} />;
    }

    return <WrappedComponent {...props} />;
  }

  HOC.displayName = `WithErrorHandler(${getDisplayName(WrappedComponent)})`;

  return HOC;
}

export default withErrorHandler;
