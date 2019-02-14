/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiLoadingSpinner, EuiIcon, isColorDark } from '@elastic/eui';
import { hexToRgb } from '../../../common/lib/hex_to_rgb';

export const Loading = ({ animated, text, backgroundColor }) => {
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

  const rgb = hexToRgb(backgroundColor);

  return (
    <div className="canvasLoading">
      {text && (
        <span>
          {text}
          &nbsp;
        </span>
      )}
      <EuiIcon color={rgb && isColorDark(...rgb) ? 'ghost' : 'text'} type="clock" />
    </div>
  );
};

Loading.propTypes = {
  animated: PropTypes.bool,
  backgroundColor: PropTypes.string,
  text: PropTypes.string,
};

Loading.defaultProps = {
  animated: false,
  backgroundColor: '#000000',
  text: '',
};
