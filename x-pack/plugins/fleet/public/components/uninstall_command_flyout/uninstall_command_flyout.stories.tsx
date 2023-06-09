/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UninstallCommandFlyoutProps } from './uninstall_command_flyout';
import { UNINSTALL_COMMAND_TARGETS } from './types';
import { UninstallCommandFlyout } from './uninstall_command_flyout';

export default {
  component: UninstallCommandFlyout,
  title: 'Sections/Fleet/Uninstall command flyout',
  argTypes: {
    target: {
      options: UNINSTALL_COMMAND_TARGETS,
      control: { type: 'radio' },
    },
  },
  args: {
    onClose: () => {},
  },
};

interface Story {
  args: Partial<UninstallCommandFlyoutProps>;
}

export const ForAgent: Story = {
  args: {
    target: 'agent',
    policyId: 'policy-id-1',
  },
};

export const ForEndpoint: Story = {
  args: {
    target: 'endpoint',
    policyId: 'policy-id-2',
  },
};
