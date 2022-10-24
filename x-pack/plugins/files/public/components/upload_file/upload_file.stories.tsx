/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { register } from '../stories_shared';
import { FilesClient } from '../../types';
import { FilesContext } from '../context';
import { UploadFile, Props } from './upload_file';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const kind = 'test';

const defaultArgs: Props = {
  kind,
  onDone: action('onDone'),
  onError: action('onError'),
};

export default {
  title: 'stateful/UploadFile',
  component: UploadFile,
  args: defaultArgs,
  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: async () => ({ file: { id: 'test' } }),
            upload: () => sleep(1000),
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
} as ComponentMeta<typeof UploadFile>;

register({
  id: kind,
  http: {},
  allowedMimeTypes: ['*'],
});

const miniFile = 'miniFile';
register({
  id: miniFile,
  http: {},
  maxSizeBytes: 1,
  allowedMimeTypes: ['*'],
});

const zipOnly = 'zipOnly';
register({
  id: zipOnly,
  http: {},
  allowedMimeTypes: ['application/zip'],
});

const Template: ComponentStory<typeof UploadFile> = (props: Props) => <UploadFile {...props} />;

export const Basic = Template.bind({});

export const AllowRepeatedUploads = Template.bind({});
AllowRepeatedUploads.args = {
  allowRepeatedUploads: true,
};

export const LongErrorUX = Template.bind({});
LongErrorUX.decorators = [
  (Story) => (
    <FilesContext
      client={
        {
          create: async () => ({ file: { id: 'test' } }),
          upload: async () => {
            await sleep(1000);
            throw new Error('Something went wrong while uploading! '.repeat(10).trim());
          },
          delete: async () => {},
        } as unknown as FilesClient
      }
    >
      <Story />
    </FilesContext>
  ),
];

export const Abort = Template.bind({});
Abort.decorators = [
  (Story) => (
    <FilesContext
      client={
        {
          create: async () => ({ file: { id: 'test' } }),
          upload: async () => {
            await sleep(60000);
          },
          delete: async () => {},
        } as unknown as FilesClient
      }
    >
      <Story />
    </FilesContext>
  ),
];

export const MaxSize = Template.bind({});
MaxSize.args = {
  kind: miniFile,
};

export const ZipOnly = Template.bind({});
ZipOnly.args = {
  kind: zipOnly,
};

export const AllowClearAfterUpload = Template.bind({});
AllowClearAfterUpload.args = {
  allowClear: true,
};

export const ImmediateUpload = Template.bind({});
ImmediateUpload.args = {
  immediate: true,
};

export const ImmediateUploadError = Template.bind({});
ImmediateUploadError.args = {
  immediate: true,
};
ImmediateUploadError.decorators = [
  (Story) => (
    <FilesContext
      client={
        {
          create: async () => ({ file: { id: 'test' } }),
          upload: async () => {
            await sleep(1000);
            throw new Error('Something went wrong while uploading!');
          },
          delete: async () => {},
        } as unknown as FilesClient
      }
    >
      <Story />
    </FilesContext>
  ),
];

export const ImmediateUploadAbort = Template.bind({});
ImmediateUploadAbort.decorators = [
  (Story) => (
    <FilesContext
      client={
        {
          create: async () => ({ file: { id: 'test' } }),
          upload: async () => {
            await sleep(60000);
          },
          delete: async () => {},
        } as unknown as FilesClient
      }
    >
      <Story />
    </FilesContext>
  ),
];
ImmediateUploadAbort.args = {
  immediate: true,
};
