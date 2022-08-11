/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiLink, EuiPanel } from '@elastic/eui';
import { Shape } from '@kbn/expression-shape-plugin/common';
import { Popover } from '../popover';
import { ShapePicker } from '../shape_picker';
import { ShapePreview } from '../shape_preview';

interface Props {
  shapes: Shape[];
  onChange?: (key: string) => void;
  value?: Shape;
  ariaLabel?: string;
}

export const ShapePickerPopover: FC<Props> = ({ shapes, onChange, value, ariaLabel }) => {
  const button = (handleClick: React.MouseEventHandler<any>) => (
    <EuiPanel paddingSize="s" hasShadow={false}>
      <EuiLink aria-label={ariaLabel} style={{ fontSize: 0 }} onClick={handleClick}>
        <ShapePreview shape={value} />
      </EuiLink>
    </EuiPanel>
  );

  return (
    <Popover panelClassName="canvas" button={button}>
      {() => <ShapePicker onChange={onChange} shapes={shapes} />}
    </Popover>
  );
};

ShapePickerPopover.propTypes = {
  ariaLabel: PropTypes.string,
  onChange: PropTypes.func,
  shapes: PropTypes.object.isRequired,
  value: PropTypes.string,
};
