/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { QualityWarning } from '../../../../common/log_analysis';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import { CategoryQualityWarnings } from './quality_warning_notices';

export default {
  title: 'infra/logAnalysis/CategoryQualityWarnings',
  decorators: [decorateWithGlobalStorybookThemeProviders],
};

export const PartitionedWarnings = () => {
  return (
    <CategoryQualityWarnings
      hasSetupCapabilities={true}
      onRecreateMlJob={action('on-recreate-ml-job')}
      qualityWarnings={partitionedQualityWarnings}
    />
  );
};

PartitionedWarnings.story = {
  name: 'Partitioned warnings',
};

export const UnpartitionedWarnings = () => {
  return (
    <CategoryQualityWarnings
      hasSetupCapabilities={true}
      onRecreateMlJob={action('on-recreate-ml-job')}
      qualityWarnings={unpartitionedQualityWarnings}
    />
  );
};

UnpartitionedWarnings.story = {
  name: 'Unpartitioned warnings',
};

const partitionedQualityWarnings: QualityWarning[] = [
  {
    type: 'categoryQualityWarning',
    jobId: 'theMlJobId',
    dataset: 'first.dataset',
    reasons: [
      { type: 'singleCategory' },
      { type: 'manyRareCategories', rareCategoriesRatio: 0.95 },
      { type: 'manyCategories', categoriesDocumentRatio: 0.7 },
    ],
  },
  {
    type: 'categoryQualityWarning',
    jobId: 'theMlJobId',
    dataset: 'second.dataset',
    reasons: [
      { type: 'noFrequentCategories' },
      { type: 'manyDeadCategories', deadCategoriesRatio: 0.7 },
    ],
  },
];

const unpartitionedQualityWarnings: QualityWarning[] = [
  {
    type: 'categoryQualityWarning',
    jobId: 'theMlJobId',
    dataset: '',
    reasons: [
      { type: 'singleCategory' },
      { type: 'manyRareCategories', rareCategoriesRatio: 0.95 },
      { type: 'manyCategories', categoriesDocumentRatio: 0.7 },
    ],
  },
];
