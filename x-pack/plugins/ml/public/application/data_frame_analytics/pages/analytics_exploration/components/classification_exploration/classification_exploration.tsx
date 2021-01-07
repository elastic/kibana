/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { ExplorationPageWrapper } from '../exploration_page_wrapper';
import { EvaluatePanel } from './evaluate_panel';
import { FeatureImportanceSummaryPanel } from '../total_feature_importance_summary/feature_importance_summary';

interface Props {
  jobId: string;
}

export const ClassificationExploration: FC<Props> = ({ jobId }) => (
  <div className="mlDataFrameAnalyticsClassification">
    <ExplorationPageWrapper
      jobId={jobId}
      title={i18n.translate(
        'xpack.ml.dataframe.analytics.classificationExploration.tableJobIdTitle',
        {
          defaultMessage: 'Destination index for classification job ID {jobId}',
          values: { jobId },
        }
      )}
      EvaluatePanel={EvaluatePanel}
      FeatureImportanceSummaryPanel={FeatureImportanceSummaryPanel}
    />
  </div>
);
