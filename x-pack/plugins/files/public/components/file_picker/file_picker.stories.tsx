/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import { FilesContext } from '../context';
import { FilePicker } from './file_picker';

export default {
  title: 'components/FilePicker',
  component: FilePicker,
  args: {},
  decorators: [
    (Story) => (
      <FilesContext>
        <Story />
      </FilesContext>
    ),
  ],
} as ComponentMeta<typeof FilePicker>;

const Template: ComponentStory<typeof FilePicker> = (props) => (
  <FilesContext>
    <FilePicker />
  </FilesContext>
);

export const Basic = Template.bind({});
