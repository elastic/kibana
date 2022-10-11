/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { FileJSON } from '../../../common';
import { FilesClient, FilesClientResponses } from '../../types';
import { register } from '../stories_shared';
import { base64dLogo } from '../image/image.constants.stories';
import { FilesContext } from '../context';
import { FilePicker, Props as FilePickerProps } from './file_picker';

const kind = 'filepicker';
register({
  id: kind,
  http: {},
  allowedMimeTypes: ['*'],
});

const defaultProps: FilePickerProps = {
  kind,
  onDone: action('done!'),
  onClose: action('close!'),
};

export default {
  title: 'components/FilePicker',
  component: FilePicker,
  args: defaultProps,
  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: () => Promise.reject(new Error('not so fast buster!')),
            list: async (): Promise<FilesClientResponses['list']> => ({
              files: [],
            }),
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
} as ComponentMeta<typeof FilePicker>;

const Template: ComponentStory<typeof FilePicker> = (props) => <FilePicker {...props} />;

export const Empty = Template.bind({});

const d = new Date();
let id = 0;
function createFileJSON(): FileJSON {
  return {
    alt: '',
    created: d.toISOString(),
    updated: d.toISOString(),
    extension: 'png',
    fileKind: kind,
    id: String(++id),
    meta: {
      width: 1000,
      height: 1000,
    },
    mimeType: 'image/png',
    name: 'my file',
    size: 1,
    status: 'READY',
  };
}
export const BasicOne = Template.bind({});
BasicOne.decorators = [
  (Story) => (
    <FilesContext
      client={
        {
          getDownloadHref: () => `data:image/png;base64,${base64dLogo}`,
          list: async (): Promise<FilesClientResponses['list']> => ({
            files: [createFileJSON()],
          }),
        } as unknown as FilesClient
      }
    >
      <Story />
    </FilesContext>
  ),
];

export const BasicMany = Template.bind({});
BasicMany.decorators = [
  (Story) => (
    <FilesContext
      client={
        {
          getDownloadHref: () => `data:image/png;base64,${base64dLogo}`,
          list: async (): Promise<FilesClientResponses['list']> => ({
            files: [
              createFileJSON(),
              createFileJSON(),
              createFileJSON(),
              createFileJSON(),
              createFileJSON(),
              createFileJSON(),
              createFileJSON(),
            ],
          }),
        } as unknown as FilesClient
      }
    >
      <Story />
    </FilesContext>
  ),
];
