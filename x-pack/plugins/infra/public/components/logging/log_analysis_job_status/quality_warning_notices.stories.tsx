/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { QualityWarning } from '../../../containers/logs/log_analysis';
import { CategoryQualityWarnings } from './quality_warning_notices';

storiesOf('infra/logAnalysis/CategoryQualityWarnings', module)
  .add('Partitioned warnings', () => {
    return (
      <CategoryQualityWarnings
        hasSetupCapabilities={true}
        onRecreateMlJob={() => {}}
        qualityWarnings={partitionedQualityWarnings}
      />
    );
  })
  .add('Unpartitioned warnings', () => {
    return (
      <CategoryQualityWarnings
        hasSetupCapabilities={true}
        onRecreateMlJob={() => {}}
        qualityWarnings={unpartitionedQualityWarnings}
      />
    );
  });

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
