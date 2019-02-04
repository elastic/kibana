/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCode } from '@elastic/eui';
export const Debug = ({ payload }) => (
  <EuiCode className="canvasDebug">
    <pre className="canvasDebug__content">{JSON.stringify(payload, null, 2)}</pre>
  </EuiCode>
);

Debug.propTypes = {
  payload: PropTypes.object.isRequired,
};
