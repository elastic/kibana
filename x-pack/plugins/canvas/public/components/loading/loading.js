/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiLoadingSpinner, EuiIcon } from '@elastic/eui';

export const Loading = ({ animated, text }) => {
  if (animated) {
    return (
      <div className="canvasLoading">
        {text && (
          <span>
            {text}
            &nbsp;
          </span>
        )}
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  return (
    <div className="canvasLoading">
      {text && (
        <span>
          {text}
          &nbsp;
        </span>
      )}
      <EuiIcon type="clock" />
    </div>
  );
};

Loading.propTypes = {
  animated: PropTypes.bool,
  text: PropTypes.string,
};

Loading.defaultProps = {
  animated: false,
  text: '',
};
