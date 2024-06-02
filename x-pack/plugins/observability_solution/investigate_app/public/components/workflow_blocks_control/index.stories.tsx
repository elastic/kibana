/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { WorkflowBlock } from '@kbn/investigate-plugin/common';
import { WorkflowBlocksControl as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/WorkflowsBlock',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

function createWorkflowBlocks(): WorkflowBlock[] {
  return [
    {
      id: '0',
      content: 'Investigate alerts',
      description: '12 open alerts',
      loading: false,
      color: 'warning',
    },
    {
      id: '1',
      content: '',
      description: '',
      loading: true,
      onClick: () => {},
    },
    {
      id: '2',
      content: 'Really really really long content to see how the component deals with wrapping',
      description:
        'I need a really long description too, because that one needs to deal with overflow as well, and should stay on a single line',
      loading: false,
      onClick: () => {},
    },
  ];
}

const defaultProps: ComponentStoryObj<typeof Component> = {
  render: (props) => {
    return (
      <div style={{ display: 'flex', width: '100%' }}>
        <Component {...props} />
      </div>
    );
  },
};

export const DefaultStory: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  args: {
    ...defaultProps.args,
    blocks: createWorkflowBlocks(),
    compressed: false,
  },
  name: 'default',
};

export const CompressedStory: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  args: {
    ...defaultProps.args,
    blocks: createWorkflowBlocks(),
    compressed: true,
  },
  name: 'compressed',
};
