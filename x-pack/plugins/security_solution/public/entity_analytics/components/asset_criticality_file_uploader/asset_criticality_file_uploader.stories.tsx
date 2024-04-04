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
import { AssetCriticalityFileUploader } from './asset_criticality_file_uploader';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

export default {
  component: AssetCriticalityFileUploader,
  title: 'Entity Analytics/AssetCriticalityFileUploader',
};

export const Default: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '800px', backgroundColor: 'white' }}>
          <AssetCriticalityFileUploader />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};
