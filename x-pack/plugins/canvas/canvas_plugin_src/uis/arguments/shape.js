/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ShapePickerMini } from '../../../public/components/shape_picker_mini/';

const ShapeArgInput = ({ onValueChange, argValue, typeInstance }) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false}>
      <ShapePickerMini
        value={argValue}
        onChange={onValueChange}
        shapes={typeInstance.options.shapes}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

ShapeArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.shape({
    options: PropTypes.shape({ shapes: PropTypes.object.isRequired }).isRequired,
  }).isRequired,
};

export const shape = () => ({
  name: 'shape',
  displayName: 'Shape',
  help: 'Shape picker',
  simpleTemplate: templateFromReactComponent(ShapeArgInput),
  default: '"square"',
});
