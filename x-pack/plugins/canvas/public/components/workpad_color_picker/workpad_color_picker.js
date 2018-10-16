/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ColorPicker } from '../color_picker';

export const WorkpadColorPicker = ({ onChange, value, colors, addColor, removeColor }) => {
  return (
    <div>
      <ColorPicker
        onChange={onChange}
        value={value}
        colors={colors}
        addColor={addColor}
        removeColor={removeColor}
      />
    </div>
  );
};

WorkpadColorPicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  colors: PropTypes.array,
  addColor: PropTypes.func,
  removeColor: PropTypes.func,
};
