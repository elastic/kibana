/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiPanel, EuiLoadingChart, EuiSpacer, EuiText } from '@elastic/eui';

export const CanvasLoading = ({ msg }) => (
  <div className="canvasContainer--loading">
    <EuiPanel>
      <EuiLoadingChart size="m" />
      <EuiSpacer size="s" />
      <EuiText>
        {/*
            For some reason a styled color is required,
            likely something with the chrome css from Kibana
          */}
        <p style={{ color: '#000' }}>{msg}</p>
      </EuiText>
    </EuiPanel>
  </div>
);

CanvasLoading.propTypes = {
  msg: PropTypes.string,
};

CanvasLoading.defaultProps = {
  msg: 'Loading...',
};
