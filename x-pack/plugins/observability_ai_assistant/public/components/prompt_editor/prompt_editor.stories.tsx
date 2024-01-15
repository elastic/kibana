/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { PromptEditor as Component, PromptEditorProps } from './prompt_editor';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator';

/*
  JSON Schema validation in the PromptEditor compponent does not work
  when rendering the component from within Storybook.
  
*/
export default {
  component: Component,
  title: 'app/Molecules/PromptEditor',
  argTypes: {},
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: PromptEditorProps) => {
  return <Component {...props} />;
};

const defaultProps = {};

export const PromptEditor = Template.bind({});
PromptEditor.args = defaultProps;
