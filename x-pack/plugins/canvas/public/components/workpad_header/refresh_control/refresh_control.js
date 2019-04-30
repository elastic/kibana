/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

export const RefreshControl = ({ doRefresh, inFlight }) => (
  <EuiToolTip position="bottom" content="Refresh data">
    <EuiButtonIcon
      disabled={inFlight}
      iconType="refresh"
      aria-label="Refresh Elements"
      onClick={doRefresh}
    />
  </EuiToolTip>
);

RefreshControl.propTypes = {
  doRefresh: PropTypes.func.isRequired,
  inFlight: PropTypes.bool,
};
