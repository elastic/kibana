/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

interface Args {
  props: React.ComponentProps<typeof Component>;
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/MiniTimeline',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

export const defaultStory: Story = {
  args: {
    props: {
      items: [
        {
          id: '1',
          title: 'My widget',
        },
        {
          id: '2',
          title: 'My other widget',
        },
        {
          id: '2',
          title: 'A widget with a really long title that overflows to see how that is handled',
        },
      ],
      onItemClick: () => {},
    },
  },
  name: 'default',
  render: function Render(args) {
    return (
      <div style={{ width: 240 }}>
        <Component {...args.props} />
      </div>
    );
  },
};
