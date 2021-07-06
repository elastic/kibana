/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Story } from '@storybook/react';
import React, { ComponentType } from 'react';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { Schema } from './';

export default {
  title: 'app/Settings/Schema',
  component: Schema,
  decorators: [
    (StoryComponent: ComponentType) => {
      const coreMock = ({
        http: {
          get: () => {
            return {};
          },
        },
      } as unknown) as CoreStart;

      createCallApmApi(coreMock);

      return (
        <MockApmPluginContextWrapper>
          <StoryComponent />
        </MockApmPluginContextWrapper>
      );
    },
  ],
};

export const Example: Story = () => {
  return <Schema />;
};
