/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../test/context_example';

import { Canvas, CanvasComponent } from '../canvas';
import { sharedWorkpads } from '../../test';
import { initialCanvasShareableState } from '../../context/state';
const { austin } = sharedWorkpads;

storiesOf('shareables/Canvas', module)
  .add('contextual: austin', () => (
    <ExampleContext source="austin">
      <Canvas />
    </ExampleContext>
  ))
  .add('contextual: hello', () => (
    <ExampleContext source="hello">
      <Canvas />
    </ExampleContext>
  ))
  .add('component', () => (
    <ExampleContext source="austin">
      <CanvasComponent
        onSetPage={action('onSetPage')}
        onSetScrubberVisible={action('onSetScrubberVisible')}
        refs={initialCanvasShareableState.refs}
        settings={initialCanvasShareableState.settings}
        stage={{
          height: 338,
          page: 0,
          width: 600,
        }}
        workpad={austin}
      />
    </ExampleContext>
  ));
