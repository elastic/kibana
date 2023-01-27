/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import React, { ComponentProps } from 'react';
import { Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RulesListNotifyBadgeWithApi } from './notify_badge_with_api';

type Args = ComponentProps<typeof RulesListNotifyBadgeWithApi>;

const rule = {
  id: uuidv4(),
  activeSnoozes: [],
  isSnoozedUntil: undefined,
  muteAll: false,
  isEditable: true,
  snoozeSchedule: [],
};

export default {
  title: 'app/RulesListNotifyBadgeWithApi',
  component: RulesListNotifyBadgeWithApi,
  argTypes: {
    rule: {
      defaultValue: rule,
      control: {
        type: 'object',
      },
    },
    isLoading: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    onRuleChanged: {},
  },
  args: {
    rule,
    onRuleChanged: (...args: any) => action('onRuleChanged')(args),
  },
};

const Template: Story<Args> = (args) => {
  return <RulesListNotifyBadgeWithApi {...args} />;
};

export const DefaultRuleNotifyBadgeWithApi = Template.bind({});

// export const DefaultRuleNotifyBadgeWithApi = Template.bind({});

// DisabledRule.args = {
//   rule: mockRule({ enabled: false }),
// };
