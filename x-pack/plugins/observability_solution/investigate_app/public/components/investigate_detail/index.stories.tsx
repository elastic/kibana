/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { mergePlainObjects } from '@kbn/investigate-plugin/common';
import { InvestigateDetail as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

interface Args {
  props: Omit<React.ComponentProps<typeof Component>, 'onLockAllClick' | 'onUnlockAllClick'>;
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/InvestigateDetail',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultStory: Story = {
  args: {
    props: {
      investigation: {
        title: 'My investigation',
      },
      isAtLatestRevision: true,
      isAtEarliestRevision: true,
      onUndoClick: () => {},
      onRedoClick: () => {},
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

export const InvestigateDetailEmptyStory: Story = {
  ...defaultStory,
  args: {
    ...defaultStory.args,
  },
  name: 'empty',
};

export const InvestigateDetailHasRedo: Story = {
  ...defaultStory,
  args: {
    props: mergePlainObjects(defaultStory.args!.props!, {
      isAtEarliestRevision: false,
      isAtLatestRevision: false,
    }),
  },
  name: 'with undo and redo',
};
