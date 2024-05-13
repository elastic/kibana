/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { AddWidgetQuickLink, AddWidgetQuickLinkList as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/AddWidgetQuickLinks',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultProps: ComponentStoryObj<typeof Component> = {
  args: {
    children: [
      <AddWidgetQuickLink
        content="Investigate alerts"
        description="12 open alerts"
        loading={false}
        color="warning"
      />,
      <AddWidgetQuickLink
        content=""
        description=""
        loading
        color="lightShade"
        onClick={() => {}}
      />,
      <AddWidgetQuickLink
        content="Really really really long content to see how the component deals with wrapping"
        description="I need a really long description too, because that one needs to deal with overflow as well, and should stay on a single line"
        loading={false}
        color="lightShade"
        onClick={() => {}}
      />,
    ],
  },
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
  name: 'default',
};
