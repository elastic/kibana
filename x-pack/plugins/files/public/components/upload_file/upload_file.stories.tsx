/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import {
  FileKindsRegistryImpl,
  setFileKindsRegistry,
  getFileKindsRegistry,
} from '../../../common/file_kinds_registry';
import { FilesClient } from '../../types';
import { FilesContext } from '../context';
import { UploadFile, Props } from './upload_file';

setFileKindsRegistry(new FileKindsRegistryImpl());

const kind = 'test';
getFileKindsRegistry().register({
  id: kind,
  http: {},
  allowedMimeTypes: ['*'],
});

const miniFile = 'miniFile';
getFileKindsRegistry().register({
  id: miniFile,
  http: {},
  maxSizeBytes: 1,
  allowedMimeTypes: ['*'],
});

const zipOnly = 'zipOnly';
getFileKindsRegistry().register({
  id: zipOnly,
  http: {},
  allowedMimeTypes: ['application/zip'],
});

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const defaultArgs: Props = {
  kind,
  onDone: action('onDone'),
  onError: action('onError'),
  client: {
    create: async () => ({ file: { id: 'test' } }),
    upload: () => sleep(1000),
  } as unknown as FilesClient,
};

export default {
  title: 'stateful/UploadFiles',
  component: UploadFile,
  args: defaultArgs,
};

const Template: ComponentStory<typeof UploadFile> = (props: Props) => (
  <FilesContext>
    <UploadFile {...props} />
  </FilesContext>
);

export const UX = Template.bind({});

export const UXError = Template.bind({});
UXError.args = {
  client: {
    create: async () => ({ file: { id: 'test' } }),
    upload: async () => {
      await sleep(1000);
      throw new Error('nope!');
    },
    delete: async () => {},
  } as unknown as FilesClient,
};

export const UXAbort = Template.bind({});
UXAbort.args = {
  client: {
    create: async () => ({ file: { id: 'test' } }),
    upload: async () => {
      await sleep(60000);
    },
    delete: async () => {},
  } as unknown as FilesClient,
};

export const UXMaxSize = Template.bind({});
UXMaxSize.args = {
  kind: miniFile,
};

export const UXZipOnly = Template.bind({});
UXZipOnly.args = {
  kind: zipOnly,
};
