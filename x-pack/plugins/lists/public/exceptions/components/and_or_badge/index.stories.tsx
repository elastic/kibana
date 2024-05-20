/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import { AndOrBadge, AndOrBadgeProps } from '.';

const sampleText =
  'Doggo ipsum i am bekom fat snoot wow such tempt waggy wags floofs, ruff heckin good boys and girls mlem.  Ruff heckin good boys and girls mlem stop it fren borkf borking doggo very hand that feed shibe, you are doing me the shock big ol heck smol borking doggo with a long snoot for pats heckin good boys. You are doing me the shock smol borking doggo with a long snoot for pats wow very biscit, length boy. Doggo ipsum i am bekom fat snoot wow such tempt waggy wags floofs, ruff heckin good boys and girls mlem.  Ruff heckin good boys and girls mlem stop it fren borkf borking doggo very hand that feed shibe, you are doing me the shock big ol heck smol borking doggo with a long snoot for pats heckin good boys.';

export default {
  argTypes: {
    includeAntennas: {
      control: {
        type: 'boolean',
      },
      description: 'Determines whether extending vertical lines appear extended off of round badge',
      table: {
        defaultValue: {
          summary: false,
        },
      },
      type: {
        required: false,
      },
    },
    type: {
      control: {
        options: ['and', 'or'],
        type: 'select',
      },
      description: '`and | or` - determines text displayed in badge.',
      table: {
        defaultValue: {
          summary: 'and',
        },
      },
      type: {
        required: true,
      },
    },
  },
  component: AndOrBadge,
  decorators: [
    (DecoratorStory: React.ComponentClass): React.ReactNode => (
      <EuiThemeProvider>
        <DecoratorStory />
      </EuiThemeProvider>
    ),
  ],
  title: 'AndOrBadge',
};

const AndOrBadgeTemplate: Story<AndOrBadgeProps> = (args) => (
  <EuiFlexGroup>
    <EuiFlexItem grow={false}>
      <AndOrBadge {...args} />
    </EuiFlexItem>
    <EuiFlexItem>
      <p>{sampleText}</p>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const Default = AndOrBadgeTemplate.bind({});
Default.args = {
  includeAntennas: false,
  type: 'and',
};
