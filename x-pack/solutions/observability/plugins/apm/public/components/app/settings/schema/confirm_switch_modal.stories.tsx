/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj } from '@storybook/react';
import type { ComponentType } from 'react';
import React from 'react';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ConfirmSwitchModal } from './confirm_switch_modal';

export default {
  title: 'app/settings/Schema',
  component: ConfirmSwitchModal,
  decorators: [
    (StoryComponent: ComponentType) => {
      return (
        <MockApmPluginStorybook>
          <StoryComponent />
        </MockApmPluginStorybook>
      );
    },
  ],
};

interface ModalArgs {
  unsupportedConfigs: Array<{ key: string; value: string }>;
}

export const Modal: StoryObj<ModalArgs> = {
  render: ({ unsupportedConfigs }) => {
    return (
      <ConfirmSwitchModal
        onCancel={() => {}}
        onConfirm={() => {}}
        unsupportedConfigs={unsupportedConfigs}
      />
    );
  },

  args: { unsupportedConfigs: [{ key: 'test', value: '123' }] },
};
