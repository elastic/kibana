/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { getAvailableShapes, Shape } from '@kbn/expression-shape-plugin/common';
import { ShapePickerPopover } from '../shape_picker_popover';

class Interactive extends React.Component<{}, { value: string }> {
  public state = {
    value: Shape.SQUARE,
  };

  public render() {
    return (
      <ShapePickerPopover
        shapes={getAvailableShapes()}
        onChange={(value) => this.setState({ value })}
        value={this.state.value}
      />
    );
  }
}

export default {
  title: 'components/Shapes/ShapePickerPopover',
};

export const Default = () => (
  <ShapePickerPopover shapes={getAvailableShapes()} onChange={action('onChange')} />
);

Default.story = {
  name: 'default',
};

export const ShapeSelected = () => (
  <ShapePickerPopover
    shapes={getAvailableShapes()}
    onChange={action('onChange')}
    value={Shape.SQUARE}
  />
);

ShapeSelected.story = {
  name: 'shape selected',
};

export const _Interactive = () => <Interactive />;

_Interactive.story = {
  name: 'interactive',

  parameters: {
    info: {
      source: false,
      propTablesExclude: [Interactive],
    },
  },
};
