/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { MiniMap as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

interface Args {
  props: Omit<React.ComponentProps<typeof Component>, 'element'>;
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/MiniMap',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

export const tallStory: Story = {
  args: {
    props: {},
  },
  name: 'tall',
  render: function Render(args) {
    const [element, setElement] = useState<HTMLDivElement | null>(null);

    return (
      <div style={{ display: 'flex', width: 815, height: 600 }}>
        <div style={{ width: 615, overflowY: 'auto' }}>
          <div style={{ width: '100%', height: '100%' }} ref={setElement}>
            <div style={{ height: 200, backgroundColor: 'red' }} />
            <div style={{ height: 600, backgroundColor: 'blue' }} />
            <div style={{ height: 800, backgroundColor: 'cyan' }} />
            <div style={{ height: 1400, backgroundColor: 'yellow' }} />
          </div>
        </div>
        <div style={{ width: 200 }}>
          <Component {...args.props} element={element} />
        </div>
      </div>
    );
  },
};

export const wideStory: Story = {
  args: {
    props: {},
  },
  name: 'wide',
  render: function Render(args) {
    const [element, setElement] = useState<HTMLDivElement | null>(null);

    return (
      <div style={{ display: 'flex', width: 800, height: 600 }}>
        <div style={{ width: 600, overflowY: 'auto' }}>
          <div style={{ width: '100%', height: '100%' }} ref={setElement}>
            <div style={{ height: 200, backgroundColor: 'red' }} />
          </div>
        </div>
        <div style={{ width: 200 }}>
          <Component {...args.props} element={element} />
        </div>
      </div>
    );
  },
};
