/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { mergePlainObjects } from '@kbn/investigate-plugin/common';
import { EntityTypeListBase as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

interface Args {
  props: Omit<React.ComponentProps<typeof Component>, 'onLockAllClick' | 'onUnlockAllClick'>;
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/EntityTypeList',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultStory: Story = {
  args: {
    props: {
      definitions: [],
      loading: true,
    },
  },
  render: function Render(args) {
    return (
      <div style={{ width: 240 }}>
        <Component {...args.props} />
      </div>
    );
  },
};

export const Default: Story = {
  ...defaultStory,
  args: {
    props: mergePlainObjects(defaultStory.args!.props!, {
      loading: false,
      definitions: [
        {
          icon: 'node',
          label: 'Services',
          type: 'service',
          count: 9,
        },
        {
          icon: 'pipeNoBreaks',
          label: 'Datasets',
          type: 'dataset',
          count: 11,
        },
      ],
    }),
  },
  name: 'default',
};

export const Empty: Story = {
  ...defaultStory,
  args: {
    props: mergePlainObjects(defaultStory.args!.props!, {
      definitions: [],
      loading: false,
    }),
  },
  name: 'empty',
};

export const Loading: Story = {
  ...defaultStory,
  args: {
    props: mergePlainObjects(defaultStory.args!.props!, {
      loading: true,
    }),
  },
  name: 'loading',
};
