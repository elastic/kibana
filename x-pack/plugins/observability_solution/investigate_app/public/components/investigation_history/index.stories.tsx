/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import { merge } from 'lodash';
import React from 'react';
import { InvestigationHistory as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

interface Args {
  props: React.ComponentProps<typeof Component>;
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/InvestigationHistory',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultStory: Story = {
  args: {
    props: {
      investigations: [],
      error: undefined,
      loading: false,
      onDeleteInvestigationClick: () => {},
      onInvestigationClick: () => {},
      onStartNewInvestigationClick: () => {},
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

export const WithInvestigationsStory: Story = {
  ...defaultStory,
  args: merge({}, defaultStory.args, {
    props: {
      loading: false,
      investigations: [
        {
          id: 'one',
          title: 'My previous investigation',
        },
        {
          id: 'two',
          title: 'Another investigation',
        },
        {
          id: 'three',
          title: 'Blabla',
        },
        {
          id: 'four',
          title: 'A really really long title that shows how this component deals with overflow',
        },
      ],
    },
  }),
  name: 'default',
};

export const LoadingEmptyStory: Story = {
  ...defaultStory,
  args: merge({}, defaultStory.args, {
    props: {
      loading: true,
    },
  }),
  name: 'loading empty',
};

export const ErrorStory: Story = {
  ...defaultStory,
  args: merge({}, defaultStory.args, {
    props: {
      loading: false,
      error: new Error('Failed to load investigations'),
    },
  }),
  name: 'error',
};
