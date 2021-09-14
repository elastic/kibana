/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiIcon, EuiLoadingSpinner, isColorDark } from '@elastic/eui';
import { hexToRgb } from '../../../common/lib/hex_to_rgb';

interface Props {
  animated?: boolean;
  backgroundColor?: string;
  text?: string;
}

export const Loading: FC<Props> = ({
  animated = false,
  text = '',
  backgroundColor = '#000000',
}) => {
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
  let color = 'text';

  if (rgb && isColorDark(rgb[0], rgb[1], rgb[2])) {
    color = 'ghost';
  }

  return (
    <div className="canvasLoading">
      {text && (
        <span>
          {text}
          &nbsp;
        </span>
      )}
      <EuiIcon color={color} type="clock" />
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
