/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon, IconType } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { readableColor } from '../../../lib/readable_color';
import { ColorDot } from '../../color_dot';
import { ItemGrid } from '../item_grid';

storiesOf('components/ItemGrid', module)
  .add('simple grid', () => (
    <ItemGrid items={['a', 'b', 'c']} children={(item) => <div key={item}>{item}</div>} />
  ))
  .add('icon grid', () => (
    <ItemGrid
      items={['plusInCircle', 'minusInCircle', 'check']}
      children={(item) => <EuiIcon key={item} type={item} />}
    />
  ))
  .add('color dot grid', () => (
    <ItemGrid items={['#fff', '#666', '#000']}>
      {(item) => <ColorDot key={item} value={item} />}
    </ItemGrid>
  ))
  .add('complex grid', () => (
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
  ));
