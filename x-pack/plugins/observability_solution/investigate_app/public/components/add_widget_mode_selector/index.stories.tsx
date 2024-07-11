/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { AddWidgetModeSelector as Component } from '.';
import { AddWidgetMode } from '../../constants/add_widget_mode';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/AddWidgetModeSelector',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultProps: ComponentStoryObj<typeof Component> = {
  args: {
    mode: AddWidgetMode.Assistant,
    assistantAvailable: true,
  },
  render: (props) => {
    return (
      <div style={{ height: '100vh', display: 'flex', maxWidth: 600 }}>
        <Component {...props} />
      </div>
    );
  },
};

export const DefaultStory: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'default',
};
