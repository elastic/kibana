/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  type PartialCriterion,
  Comparator,
} from '../../../../../common/alerting/logs/log_threshold';
import { CriterionPreview } from '../expression_editor/criterion_preview_chart';
import { AlertDetailsAppSectionProps } from './types';

// const param: PartialRuleParams = {
//   timeSize: 1000,
//   timeUnit: 'm',
//   logView: { logViewId: 'default', type: 'log-view-inline' },
//   count: { value: 75, comparator: Comparator.GT },
//   criteria: [{ field: 'log.level', comparator: Comparator.EQ, value: 'error' }],
// };

const chartCriterion: PartialCriterion = {
  field: 'log.level',
  comparator: Comparator.EQ,
  value: 'error',
};
const AlertDetailsAppSection = ({ rule, alert }: AlertDetailsAppSectionProps) => {
  return (
    <CriterionPreview
      ruleParams={rule.params}
      sourceId={rule.params.logView.logViewId}
      chartCriterion={chartCriterion}
      showThreshold={true}
      executionTimestamp={Date.now() - 10000000}
    />
  );
};
// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
