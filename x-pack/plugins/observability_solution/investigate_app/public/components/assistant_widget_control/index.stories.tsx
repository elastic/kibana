/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { AssistantWidgetControlBase as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/AssistantControlWidget',
  decorators: [KibanaReactStorybookDecorator],
};

function Wrapper(props: React.ComponentProps<typeof Component>) {
  return (
    <div style={{ display: 'flex', flex: 1 }}>
      <Component {...props} />
    </div>
  );
}

export default meta;

const defaultProps: ComponentStoryObj<typeof Component> = {
  render: Wrapper,
};

export const Default: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'default',
  args: {
    prompt: '',
  },
};

export const SimplePrompt: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'Simple prompt',
  args: {
    prompt: 'Show me my logs data',
  },
};

export const Loading: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'Loading',
  args: {
    prompt: 'Show me my logs data',
    loading: true,
  },
};

export const WithStatus: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'With status',
  args: {
    prompt: 'Show me my logs data',
    loading: true,
    status: 'Looking through existing visualizations',
  },
};

export const WithError: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'With error',
  args: {
    prompt: 'Show me my logs data',
    loading: false,
    error: new Error('Unexpected error occurred'),
  },
};
