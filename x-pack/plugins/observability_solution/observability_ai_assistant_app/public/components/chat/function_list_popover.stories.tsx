/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator';
import { FunctionListPopover as Component } from './function_list_popover';

export default {
  component: Component,
  title: 'app/Organisms/FunctionListPopover',
  decorators: [KibanaReactStorybookDecorator],
};

type FunctionListPopover = React.ComponentProps<typeof Component>;

const Template: ComponentStory<typeof Component> = (props: FunctionListPopover) => {
  return <Component {...props} />;
};

const defaultProps: FunctionListPopover = {
  onSelectFunction: () => {},
  disabled: false,
  mode: 'prompt',
  selectedFunctionName: 'foo',
};

export const ConversationList = Template.bind({});
ConversationList.args = defaultProps;
