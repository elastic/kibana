/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiPortal, EuiProgress } from '@elastic/eui';

export const WorkpadProgress = ({ inFlight, ...rest }) =>
  inFlight && (
    <EuiPortal>
      <EuiProgress position="fixed" {...rest} />
    </EuiPortal>
  );

WorkpadProgress.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
};
