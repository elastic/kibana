/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RuleTagBadge } from './rule_tag_badge';

type Args = ComponentProps<typeof RuleTagBadge>;

export default {
  title: 'app/RuleTagBadge',
  component: RuleTagBadge,
  argTypes: {
    isOpen: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    onClick: {},
    onClose: {},
    tagsOutPopover: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    tags: {
      defaultValue: ['tag1', 'tag2', 'tag3'],
      control: {
        type: 'object',
      },
    },
    badgeDataTestSubj: {
      control: {
        type: 'text',
      },
    },
    titleDataTestSubj: {
      control: {
        type: 'text',
      },
    },
    tagItemDataTestSubj: {
      control: {
        type: 'text',
      },
    },
  },
  args: {
    onClick: () => action('onClick')(),
    onClose: () => action('onClose')(),
  },
};

const Template: Story<Args> = (args) => {
  return <RuleTagBadge {...args} />;
};

export const Default = Template.bind({});

export const OutPopover = Template.bind({});
OutPopover.args = {
  tagsOutPopover: true,
};
