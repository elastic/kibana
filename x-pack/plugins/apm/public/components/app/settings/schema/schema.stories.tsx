/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react';
import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '@kbn/core/public';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import { Schema } from '.';
import { ConfirmSwitchModal } from './confirm_switch_modal';

interface Args {
  hasCloudAgentPolicy: boolean;
  hasCloudApmPackagePolicy: boolean;
  cloudApmMigrationEnabled: boolean;
  hasRequiredRole: boolean;
  isMigrating: boolean;
}

export default {
  title: 'app/settings/Schema',
  component: Schema,
  argTypes: {
    hasCloudAgentPolicy: {
      control: {
        type: 'boolean',
        options: [true, false],
        defaultValue: true,
      },
    },
    hasCloudApmPackagePolicy: {
      control: {
        type: 'boolean',
        options: [true, false],
        defaultValue: false,
      },
    },
    cloudApmMigrationEnabled: {
      control: {
        type: 'boolean',
        options: [true, false],
        defaultValue: true,
      },
    },
    hasRequiredRole: {
      control: {
        type: 'boolean',
        options: [true, false],
        defaultValue: true,
      },
    },
    isMigrating: {
      control: {
        type: 'boolean',
        options: [true, false],
        defaultValue: false,
      },
    },
  },
  decorators: [
    (StoryComponent: ComponentType, { args }: Meta<Args>) => {
      if (args?.isMigrating) {
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 5);
        window.localStorage.setItem(
          'apm.dataStreamsMigrationStatus',
          JSON.stringify({
            value: 'loading',
            expiry: expiryDate.toISOString(),
          })
        );
      } else {
        window.localStorage.removeItem('apm.dataStreamsMigrationStatus');
      }
      const coreMock = {
        http: {
          basePath: { prepend: () => {} },
          get: () => {
            return {
              has_cloud_agent_policy: args?.hasCloudAgentPolicy,
              has_cloud_apm_package_policy: args?.hasCloudApmPackagePolicy,
              cloud_apm_migration_enabled: args?.cloudApmMigrationEnabled,
              has_required_role: args?.hasRequiredRole,
            };
          },
        },
        uiSettings: { get: () => '' },
      } as unknown as CoreStart;

      createCallApmApi(coreMock);

      return (
        <MockApmPluginContextWrapper>
          <MemoryRouter>
            <StoryComponent />
          </MemoryRouter>
        </MockApmPluginContextWrapper>
      );
    },
  ],
};

export const Example: Story = () => {
  return <Schema />;
};

interface ModalArgs {
  unsupportedConfigs: Array<{ key: string; value: string }>;
}

export const Modal: Story<ModalArgs> = ({ unsupportedConfigs }) => {
  return (
    <ConfirmSwitchModal
      onCancel={() => {}}
      onConfirm={() => {}}
      unsupportedConfigs={unsupportedConfigs}
    />
  );
};
Modal.args = { unsupportedConfigs: [{ key: 'test', value: '123' }] };
