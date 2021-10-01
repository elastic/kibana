/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGrid, EuiFlexItem, EuiLink } from '@elastic/eui';
import { ShapePreview } from '../shape_preview';
import { Shape } from '../../../../../../src/plugins/expression_shape/common';

interface Props {
  shapes: Shape[];
  onChange?: (key: string) => void;
}

export const ShapePicker: FC<Props> = ({ shapes, onChange = () => {} }) => (
  <EuiFlexGrid gutterSize="s" columns={4} className="canvasShapePicker">
    {shapes.sort().map((shapeKey: string) => (
      <EuiFlexItem key={shapeKey}>
        <EuiLink onClick={() => onChange(shapeKey)}>
          <ShapePreview shape={shapeKey} />
        </EuiLink>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

ShapePicker.propTypes = {
  onChange: PropTypes.func,
  shapes: PropTypes.object.isRequired,
};
