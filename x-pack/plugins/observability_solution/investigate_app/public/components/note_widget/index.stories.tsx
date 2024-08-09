/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { NoteWidget as Component } from '.';
import { extendProps } from '../../../.storybook/extend_props';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

interface Args {
  props: Omit<React.ComponentProps<typeof Component>, 'onChange' | 'onDelete'>;
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/NoteWidget',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultStory: Story = {
  args: {
    props: {
      user: {
        username: 'johndoe',
        full_name: 'John Doe',
      },
      note: 'A short note',
    },
  },
  render: function Render(args) {
    return (
      <div style={{ width: 800, height: 600 }}>
        <Component {...args.props} onChange={() => {}} onDelete={() => {}} />
      </div>
    );
  },
};

export const ShortNoteStory: Story = {
  ...defaultStory,
  args: {
    props: extendProps(defaultStory.args!.props!, {
      note: 'A short note',
    }),
  },
  name: 'default',
};
