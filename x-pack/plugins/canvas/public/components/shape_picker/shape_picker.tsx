/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGrid, EuiFlexItem, EuiLink } from '@elastic/eui';
import { ShapePreview } from '../shape_preview';

interface Props {
  shapes: {
    [key: string]: string;
  };
  onChange?: (key: string) => void;
}

export const ShapePicker: FC<Props> = ({ shapes, onChange = () => {} }) => {
  return (
    <EuiFlexGrid gutterSize="s" columns={4} className="canvasShapePicker">
      {Object.keys(shapes)
        .sort()
        .map((shapeKey) => (
          <EuiFlexItem key={shapeKey}>
            <EuiLink onClick={() => onChange(shapeKey)}>
              <ShapePreview shape={shapes[shapeKey]} />
            </EuiLink>
          </EuiFlexItem>
        ))}
    </EuiFlexGrid>
  );
};

ShapePicker.propTypes = {
  onChange: PropTypes.func,
  shapes: PropTypes.object.isRequired,
};
