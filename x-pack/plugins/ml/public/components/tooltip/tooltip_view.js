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

export function Tooltip({ position = 'top', text, transclude }) {
  return (
    <EuiToolTip position={position} content={text}>
      <span ref={transclude} />
    </EuiToolTip>
  );
}
Tooltip.propTypes = {
  position: PropTypes.string,
  text: PropTypes.string,
  transclude: PropTypes.func
};
