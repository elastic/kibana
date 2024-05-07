/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Story } from '@storybook/react';
import { addDecorator } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { AssetCriticalitySelector } from './asset_criticality_selector';
import type { State } from './use_asset_criticality';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));
const criticality = {
  status: 'create',
  query: {},
  privileges: {},
  mutation: {},
} as State;

const criticalityLoading = {
  ...criticality,
  query: { isLoading: true },
} as State;

export default {
  component: AssetCriticalitySelector,
  title: 'Components/AssetCriticalitySelector',
};

export const Default: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '300px' }}>
          <AssetCriticalitySelector
            criticality={criticality}
            entity={{ type: 'host' as const, name: 'My test Host' }}
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const Compressed: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '300px' }}>
          <AssetCriticalitySelector
            criticality={criticality}
            entity={{ type: 'host' as const, name: 'My test Host' }}
            compressed
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const Loading: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '300px' }}>
          <AssetCriticalitySelector
            criticality={criticalityLoading}
            entity={{ type: 'host' as const, name: 'My test Host' }}
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};
