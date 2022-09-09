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
import { UploadFile, Props } from './upload_file';

const kind = 'test';
setFileKindsRegistry(new FileKindsRegistryImpl());
getFileKindsRegistry().register({
  id: kind,
  http: {},
  allowedMimeTypes: ['applciation/pdf'],
});

const defaultArgs: Props = {
  kind,
  onDone: action('onDone'),
  client: {
    create: async () => ({ file: { id: 'test' } }),
    upload: async () => {},
  } as unknown as FilesClient,
};

export default {
  title: 'stateful/UploadFiles',
  component: UploadFile,
  args: defaultArgs,
};

const Template: ComponentStory<typeof UploadFile> = (props: Props) => <UploadFile {...props} />;

export const Basic = Template.bind({});
