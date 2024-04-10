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
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { AssetCriticalityFileUploader } from './asset_criticality_file_uploader';
import { AssetCriticalityResultStep } from './components/result_step';
import { AssetCriticalityValidationStep } from './components/validation_step';
import { AssetCriticalityFilePickerStep } from './components/file_picker_step';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

const validLinesAsText = `user-001,low_impact\nuser-002,medium_impact,user\nuser-003,medium_impact,user\nhost-001,extreme_impact,host\nhost-002,extreme_impact,host`;
const invalidLinesAsText = `user,user-001,wow_impact\nbleh,user-002,medium_impact\nuser,user-003,medium_impact,extra_column`;

export default {
  component: AssetCriticalityFileUploader,
  title: 'Entity Analytics/AssetCriticalityFileUploader',
};

export const Default: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '800px' }}>
          <EuiPanel>
            <AssetCriticalityFileUploader />
          </EuiPanel>
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const FilePickerStep: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '800px' }}>
          <EuiPanel>
            <AssetCriticalityFilePickerStep onFileChange={() => {}} isLoading={true} />
          </EuiPanel>
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const ValidationStep: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '800px' }}>
          <EuiPanel>
            <AssetCriticalityValidationStep
              validLinesCount={5}
              invalidLinesCount={3}
              fileName="test.csv"
              fileSize={100}
              onConfirm={() => {}}
              onReturn={() => {}}
              validLinesAsText={validLinesAsText}
              invalidLinesAsText={invalidLinesAsText}
              invalidLinesErrors={[
                { error: 'error message 1', index: 1 },
                { error: 'error message 2', index: 2 },
                { error: 'error message 3', index: 3 },
              ]}
            />
          </EuiPanel>
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const ResultsStep: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '800px' }}>
          <b>{'Results Step - Success'}</b>
          <EuiSpacer size="s" />

          <EuiPanel>
            <AssetCriticalityResultStep
              onReturn={() => {}}
              validLinesAsText={validLinesAsText}
              result={{
                errors: [],
                stats: {
                  total: 10,
                  successful: 10,
                  failed: 0,
                },
              }}
            />
          </EuiPanel>
          <EuiSpacer size="xl" />

          <b>{'Results Step - Partial error'}</b>
          <EuiSpacer size="s" />

          <EuiPanel>
            <AssetCriticalityResultStep
              onReturn={() => {}}
              validLinesAsText={validLinesAsText}
              result={{
                errors: [
                  { message: 'error message 1', index: 1 },
                  { message: 'error message 2', index: 3 },
                  { message: 'error message 3', index: 5 },
                ],
                stats: {
                  total: 5,
                  successful: 2,
                  failed: 3,
                },
              }}
            />
          </EuiPanel>

          <EuiSpacer size="xl" />

          <b>{'Results Step - Complete failure'}</b>
          <EuiSpacer size="s" />

          <EuiPanel>
            <AssetCriticalityResultStep
              onReturn={() => {}}
              validLinesAsText=""
              errorMessage="Something went wrong"
            />
          </EuiPanel>
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};
