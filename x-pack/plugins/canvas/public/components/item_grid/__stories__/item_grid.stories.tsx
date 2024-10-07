/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, IconType } from '@elastic/eui';
import React from 'react';
import { readableColor } from '../../../lib/readable_color';
import { ColorDot } from '../../color_dot';
import { ItemGrid } from '../item_grid';

export default {
  title: 'components/ItemGrid',
};

export const SimpleGrid = () => (
  <ItemGrid items={['a', 'b', 'c']} children={(item) => <div key={item}>{item}</div>} />
);

SimpleGrid.story = {
  name: 'simple grid',
};

export const IconGrid = () => (
  <ItemGrid
    items={['plusInCircle', 'minusInCircle', 'check']}
    children={(item) => <EuiIcon key={item} type={item} />}
  />
);

IconGrid.story = {
  name: 'icon grid',
};

export const ColorDotGrid = () => (
  <ItemGrid items={['#fff', '#666', '#000']}>
    {(item) => <ColorDot key={item} value={item} />}
  </ItemGrid>
);

ColorDotGrid.story = {
  name: 'color dot grid',
};

export const ComplexGrid = () => (
  <ItemGrid
    items={
      [
        { color: '#fff', icon: 'plusInCircle' },
        { color: '#666', icon: 'minusInCircle' },
        { color: '#000', icon: 'check' },
      ] as Array<{ color: string; icon: IconType }>
    }
  >
    {(item) => (
      <ColorDot key={item.color} value={item.color}>
        <EuiIcon type={item.icon} color={readableColor(item.color)} />
      </ColorDot>
    )}
  </ItemGrid>
);

ComplexGrid.story = {
  name: 'complex grid',
};
