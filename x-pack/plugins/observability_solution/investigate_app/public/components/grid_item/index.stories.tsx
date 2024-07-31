/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { v4 } from 'uuid';
import { GridItem as Component } from '.';
import { extendProps } from '../../../.storybook/extend_props';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

type Props = React.ComponentProps<typeof Component>;

interface Args {
  props: Partial<Props> & { id: string; children: React.ReactNode };
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/GridItem',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultProps: Story = {
  args: {
    props: {
      id: v4(),
      children: <>TODO</>,
    },
  },
  render: ({ props }) => {
    return (
      <div style={{ width: 800, height: 600 }}>
        <Component
          faded={false}
          locked={false}
          loading={false}
          onCopy={() => {}}
          onDelete={() => {}}
          onLockToggle={() => {}}
          onOverrideRemove={async () => {}}
          onTitleChange={() => {}}
          overrides={[]}
          title="My visualization"
          description="A long description"
          onEditClick={() => {}}
          {...props}
        />
      </div>
    );
  },
};

export const GridItemStory: Story = {
  ...defaultProps,
  args: {
    props: extendProps(defaultProps.args!.props!, {
      title: 'A widget title',
      children: <>TODO</>,
      description:
        'An even longer description that should flow off screen especially if there are overrides defined',
      overrides: [
        {
          id: 'query',
          label: `service.name:opbeans-java AND service.environment:(production OR development)`,
        },
      ],
    }),
  },
  name: 'default',
};
