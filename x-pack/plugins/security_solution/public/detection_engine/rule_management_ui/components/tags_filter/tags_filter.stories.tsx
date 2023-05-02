/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import type { Story } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';

import type { TagsFilterProps } from './tags_filter';
import { TagsFilter } from './tags_filter';

export default {
  title: 'Rule Mgmt/Rules Table/TagsFilter',
  component: TagsFilter,
  decorators: [
    (Story: Story) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <Story />
      </ThemeProvider>
    ),
  ],
  argTypes: {
    onSelectedTagsChanged: { action: 'selectedTagsChanged' },
    selectedTags: {
      defaultValue: ['tag_one'],
      control: 'object',
    },
    tags: {
      defaultValue: ['tag_one', 'tag_two'],
      control: 'object',
    },
  },
};

export const DefaultState: Story<TagsFilterProps> = (args) => <TagsFilter {...args} />;

// DefaultState.args = {
//
// }
