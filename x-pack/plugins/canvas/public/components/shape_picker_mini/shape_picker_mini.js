/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiLink } from '@elastic/eui';
import { Popover } from '../popover';
import { ShapePicker } from '../shape_picker/';
import { ShapePreview } from '../shape_preview';

export const ShapePickerMini = ({ shapes, onChange, value, anchorPosition }) => {
  const button = handleClick => (
    <EuiLink style={{ fontSize: 0 }} onClick={handleClick}>
      <ShapePreview shape={shapes[value]} />
    </EuiLink>
  );

  return (
    <Popover
      panelClassName="canvas canvasShapePickerMini--popover"
      button={button}
      anchorPosition={anchorPosition}
    >
      {() => <ShapePicker onChange={onChange} shapes={shapes} />}
    </Popover>
  );
};

ShapePickerMini.propTypes = {
  shapes: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
  anchorPosition: PropTypes.string,
};
