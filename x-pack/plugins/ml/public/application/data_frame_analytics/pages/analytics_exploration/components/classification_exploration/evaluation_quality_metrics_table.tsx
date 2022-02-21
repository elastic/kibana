/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiInMemoryTable, EuiPanel } from '@elastic/eui';

import { ClassificationMetricItem } from '../../../../common/analytics';

const columns = [
  {
    field: 'className',
    name: i18n.translate(
      'xpack.ml.dataframe.analytics.classificationExploration.recallAndAccuracyClassColumn',
      {
        defaultMessage: 'Class',
      }
    ),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'accuracy',
    name: i18n.translate(
      'xpack.ml.dataframe.analytics.classificationExploration.recallAndAccuracyAccuracyColumn',
      {
        defaultMessage: 'Accuracy',
      }
    ),
    render: (value: number) => Math.round(value * 1000) / 1000,
  },
  {
    field: 'recall',
    name: i18n.translate(
      'xpack.ml.dataframe.analytics.classificationExploration.recallAndAccuracyRecallColumn',
      {
        defaultMessage: 'Recall',
      }
    ),
    render: (value: number) => Math.round(value * 1000) / 1000,
  },
];

export const EvaluationQualityMetricsTable: FC<{
  evaluationMetricsItems: ClassificationMetricItem[];
}> = ({ evaluationMetricsItems }) => (
  <>
    <EuiAccordion
      id="recall-and-accuracy"
      buttonContent={
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.classificationExploration.evaluateSectionRecallAndAccuracy"
          defaultMessage="Per class recall and accuracy"
        />
      }
    >
      <EuiPanel>
        <EuiInMemoryTable<ClassificationMetricItem>
          items={evaluationMetricsItems}
          columns={columns}
          pagination
          sorting
        />
      </EuiPanel>
    </EuiAccordion>
  </>
);
