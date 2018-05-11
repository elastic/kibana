/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';

import React from 'react';

import {
  EuiToolTip
} from '@elastic/eui';

const Tooltip = ({ text, transclude }) => (
  <EuiToolTip position="top" content={text}>
    <span ref={transclude} />
  </EuiToolTip>
);
Tooltip.propTypes = {
  text: PropTypes.string,
  transclude: PropTypes.func
};

export { Tooltip };
