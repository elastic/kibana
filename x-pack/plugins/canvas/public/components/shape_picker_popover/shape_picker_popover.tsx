/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, JSXElementConstructor } from 'react';
import PropTypes from 'prop-types';
import { EuiLink, EuiPanel } from '@elastic/eui';
import {
  withSuspense,
  LazyPopoverComponent,
} from '../../../../../../src/plugins/presentation_util/public';
import { ShapePicker } from '../shape_picker';
import { ShapePreview } from '../shape_preview';

const Popover = withSuspense(LazyPopoverComponent);

interface Props {
  shapes: {
    [key: string]: JSXElementConstructor<any>;
  };
  onChange?: (key: string) => void;
  value?: string;
  ariaLabel?: string;
}

export const ShapePickerPopover: FC<Props> = ({ shapes, onChange, value, ariaLabel }) => {
  const button = (handleClick: React.MouseEventHandler<any>) => (
    <EuiPanel paddingSize="s" hasShadow={false}>
      <EuiLink aria-label={ariaLabel} style={{ fontSize: 0 }} onClick={handleClick}>
        <ShapePreview shape={value ? shapes[value] : undefined} />
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
