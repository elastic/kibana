/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';
import type { Story, ComponentMeta, ComponentStory } from '@storybook/react';

import { savedRuleMock } from '../../../rule_management/logic/mock';
import { MlRuleWarningPopover } from './ml_rule_warning_popover';
import type { MlRuleWarningPopoverComponentProps } from './ml_rule_warning_popover';
import { mockSecurityJobs } from '../../../../common/components/ml_popover/api.mock';

const mlRuleWarningPopover: ComponentMeta<typeof MlRuleWarningPopover> = {
  title: 'Rule Mgmt/MlRuleWarningPopover',
  component: MlRuleWarningPopover,
  decorators: [
    (Story: Story) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default mlRuleWarningPopover;

const Template: ComponentStory<typeof MlRuleWarningPopover> = (
  args: MlRuleWarningPopoverComponentProps
) => <MlRuleWarningPopover {...args} />;

export const Default = Template.bind({});
Default.args = {
  rule: {
    ...savedRuleMock,
    type: 'machine_learning',
    anomaly_threshold: 58,
    machine_learning_job_id: ['siem-api-rare_process_linux_ecs'],
  },
  loadingJobs: false,
  jobs: mockSecurityJobs,
};
