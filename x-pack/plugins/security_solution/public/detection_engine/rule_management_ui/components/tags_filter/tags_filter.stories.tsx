/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {ThemeProvider} from 'styled-components';
import {Story} from '@storybook/react';
import {euiLightVars} from '@kbn/ui-theme';

import {TagsFilterPopover, TagsFilterPopoverProps} from './tags_filter';


// addDecorator((storyFn) => (
//   <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
// ));
//
// storiesOf('RulesTable/TagsFilter', module)
//   .add('One OS', () => {
//     return (
//       <TagsFilterPopover
//         onSelectedTagsChanged={() => {}}
//         selectedTags={[]}
//         tags={[]}
//         data-test-subj="allRulesTagPopover"
//           />
//     );
//   });

export default {
  title: 'Rules Table/TagsFilterPopover',
  component: TagsFilterPopover,
  decorators: [
    (Story: Story) => (
      <ThemeProvider theme={() => ({eui: euiLightVars, darkMode: false})}><Story/></ThemeProvider>
    ),
  ],
  argTypes: {
    onSelectedTagsChanged: {action: 'selectedTagsChanged'},
    selectedTags: {
      defaultValue: ['tag_one'],
      control: 'object',
    },
    tags: {
      defaultValue: ['tag_one', 'tag_two'],
      control: 'object',
    },
  },
}

export const DefaultState: Story<TagsFilterPopoverProps> = (args) => <TagsFilterPopover {...args} />;

// DefaultState.args = {
//
// }
