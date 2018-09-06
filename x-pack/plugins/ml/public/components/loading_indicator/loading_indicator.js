/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import './styles/main.less';

import PropTypes from 'prop-types';
import React from 'react';

export function LoadingIndicator({ height }) {
  height = height ? +height : 100;
  return (
    <div className="ml-loading-indicator" style={{ height: `${height}px` }}>
      <div className="loading-spinner"><i className="fa fa-spinner fa-spin" /></div>
    </div>
  );
}
LoadingIndicator.propTypes = {
  height: PropTypes.number
};
