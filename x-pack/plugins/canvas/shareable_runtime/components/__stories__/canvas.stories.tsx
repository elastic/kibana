/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../test/context_example';

import { Canvas, CanvasComponent } from '../canvas';
import { sharedWorkpads } from '../../test';
import { initialCanvasShareableState } from '../../context/state';
const { austin } = sharedWorkpads;

export default {
  title: 'shareables/Canvas',
};

export const ContextualAustin = () => (
  <ExampleContext source="austin">
    <Canvas />
  </ExampleContext>
);

ContextualAustin.story = {
  name: 'contextual: austin',
};

export const ContextualHello = () => (
  <ExampleContext source="hello">
    <Canvas />
  </ExampleContext>
);

ContextualHello.story = {
  name: 'contextual: hello',
};

export const Component = () => (
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
);

Component.story = {
  name: 'component',
};
