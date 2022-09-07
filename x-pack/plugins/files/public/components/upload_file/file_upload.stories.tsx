/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { FileUploadUI, Props } from './file_upload';

export default {
  title: 'components/FileUploadUI',
  component: FileUploadUI,
  args: { onDone: action('onDone') },
};

const Template: ComponentStory<typeof FileUploadUI> = (props: Props) => <FileUploadUI {...props} />;

export const BasicUI = Template.bind({});
