/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { FilesClient, FilesClientResponses } from '../../types';
import { register } from '../stories_shared';
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
