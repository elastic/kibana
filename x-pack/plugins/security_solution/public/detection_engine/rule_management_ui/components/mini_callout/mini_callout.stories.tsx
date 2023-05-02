/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { COLORS } from '@elastic/eui';

import type { MiniCalloutProps } from './mini_callout';
import { MiniCallout } from './mini_callout';
import * as i18n from './translations';

export default {
  title: 'Rule Mgmt/MiniCallout',
  component: MiniCallout,
  argTypes: {
    iconType: {
      defaultValue: 'iInCircle',
      type: 'text',
    },
    title: {
      control: 'object',
      defaultValue: 'MiniCallout Title',
    },
    color: {
      control: {
        type: 'select',
        defaultValue: 'primary',
        options: COLORS,
      },
    },
  },
};

export const DefaultState: Story<MiniCalloutProps> = (args) => <MiniCallout {...args} />;
DefaultState.args = {};

export const UpdateRules = DefaultState.bind({});
UpdateRules.args = {
  title: i18n.NEW_PREBUILT_RULES_CALLOUT_TITLE,
};

export const NewRules = DefaultState.bind({});
NewRules.args = {
  title: i18n.UPDATE_RULES_CALLOUT_TITLE,
  color: 'success',
};
