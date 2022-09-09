/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { UploadFileUI, Props } from './upload_file_ui';

const defaultArgs: Props = {
  onChange: action('onChange'),
  onDone: action('onDone'),
  onClear: action('onClear'),
  onUpload: action('onUpload'),
  onCancel: action('onCancel'),
};

export default {
  title: 'components/UploadFileUI',
  component: UploadFileUI,
  args: defaultArgs,
};

const Template: ComponentStory<typeof UploadFileUI> = (props: Props) => <UploadFileUI {...props} />;

export const Basic = Template.bind({});

export const Uploading = Template.bind({});
Uploading.args = {
  uploading: true,
};

export const Retry = Template.bind({});
Retry.args = {
  retry: true,
};

export const ImmediateUpload = Template.bind({});
ImmediateUpload.args = {
  immediate: true,
};

export const ImmediateUploadRetry = Template.bind({});
ImmediateUploadRetry.args = {
  retry: true,
};
