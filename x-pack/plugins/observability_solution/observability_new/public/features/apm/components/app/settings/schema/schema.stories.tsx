/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import type { Meta, Story } from '@storybook/react';
import React, { ComponentType } from 'react';
import { Schema } from '.';
import { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';

interface Args {
  hasCloudAgentPolicy: boolean;
  hasCloudApmPackagePolicy: boolean;
  cloudApmMigrationEnabled: boolean;
  hasApmIntegrations: boolean;
  hasRequiredRole: boolean;
  isMigrating: boolean;
  latestApmPackageVersion: string;
}

type MigrationCheckAPIReturnType = APIReturnType<'GET /internal/apm/fleet/migration_check'>;

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
    hasApmIntegrations: {
      control: {
        type: 'boolean',
        options: [true, false],
        defaultValue: true,
      },
    },
    latestApmPackageVersion: {
      control: {
        type: 'string',
        defaultValue: '8.7',
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
          get: async (): Promise<MigrationCheckAPIReturnType> => {
            return {
              has_cloud_agent_policy: args?.hasCloudAgentPolicy || true,
              has_cloud_apm_package_policy: args?.hasCloudApmPackagePolicy || true,
              cloud_apm_migration_enabled: args?.cloudApmMigrationEnabled || true,
              has_required_role: args?.hasRequiredRole,
              has_apm_integrations: args?.hasApmIntegrations || true,
              latest_apm_package_version: args?.latestApmPackageVersion || '8.6',
              cloud_apm_package_policy: undefined,
            };
          },
        },
      } as unknown as CoreStart;

      return (
        <MockApmPluginStorybook apmContext={{ core: coreMock } as unknown as ApmPluginContextValue}>
          <StoryComponent />
        </MockApmPluginStorybook>
      );
    },
  ],
};

export const Example: Story = () => {
  return <Schema />;
};
