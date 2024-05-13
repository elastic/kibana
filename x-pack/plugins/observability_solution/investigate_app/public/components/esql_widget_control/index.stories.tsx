/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { EsqlWidgetControl as Component } from '.';
import '../../../.storybook/mock_kibana_services';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/EsqlControlWidget',
  decorators: [KibanaReactStorybookDecorator],
};

function WithContainer(props: React.ComponentProps<typeof Component>) {
  return (
    <div style={{ display: 'flex', flex: 1 }}>
      <Component {...props} />
    </div>
  );
}

export default meta;

const defaultProps: ComponentStoryObj<typeof Component> = {
  render: WithContainer,
};

export const EsqlControlStory: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'default',
};
