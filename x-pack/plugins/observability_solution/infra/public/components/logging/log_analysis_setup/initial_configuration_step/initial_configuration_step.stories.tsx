/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import { InitialConfigurationStep } from './initial_configuration_step';

storiesOf('infra/logAnalysis/SetupInitialConfigurationStep', module)
  .addDecorator((renderStory) => <div style={{ maxWidth: 800 }}>{renderStory()}</div>)
  .addDecorator(decorateWithGlobalStorybookThemeProviders)
  .add('Reconfiguration with partitioned warnings', () => {
    return (
      <InitialConfigurationStep
        {...storyActions}
        startTime={Date.now()}
        endTime={undefined}
        isValidating={false}
        setupStatus={{ type: 'required' }}
        validatedIndices={[
          {
            name: 'index-1-*',
            validity: 'valid',
            isSelected: true,
            datasetFilter: { type: 'includeAll' },
            availableDatasets: ['first', 'second', 'third'],
          },
          {
            name: 'index-2-*',
            validity: 'invalid',
            errors: [{ index: 'index-2-*', error: 'INDEX_NOT_FOUND' }],
          },
        ]}
        previousQualityWarnings={[
          {
            type: 'categoryQualityWarning',
            jobId: 'job-1',
            dataset: 'second',
            reasons: [
              { type: 'noFrequentCategories' },
              { type: 'manyDeadCategories', deadCategoriesRatio: 0.9 },
            ],
          },
          {
            type: 'categoryQualityWarning',
            jobId: 'job-1',
            dataset: 'third',
            reasons: [{ type: 'singleCategory' }],
          },
        ]}
      />
    );
  })
  .add('Reconfiguration with unpartitioned warnings', () => {
    return (
      <InitialConfigurationStep
        {...storyActions}
        startTime={Date.now()}
        endTime={undefined}
        isValidating={false}
        setupStatus={{ type: 'required' }}
        validatedIndices={[
          {
            name: 'index-1-*',
            validity: 'valid',
            isSelected: true,
            datasetFilter: { type: 'includeAll' },
            availableDatasets: ['first', 'second', 'third'],
          },
          {
            name: 'index-2-*',
            validity: 'invalid',
            errors: [{ index: 'index-2-*', error: 'INDEX_NOT_FOUND' }],
          },
        ]}
        previousQualityWarnings={[
          {
            type: 'categoryQualityWarning',
            jobId: 'job-1',
            dataset: '',
            reasons: [
              { type: 'noFrequentCategories' },
              { type: 'manyDeadCategories', deadCategoriesRatio: 0.9 },
            ],
          },
          {
            type: 'categoryQualityWarning',
            jobId: 'job-1',
            dataset: '',
            reasons: [{ type: 'singleCategory' }],
          },
        ]}
      />
    );
  });

const storyActions = actions('setStartTime', 'setEndTime', 'setValidatedIndices');
