/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { useState } from 'react';
import {
  Aggregators,
  CustomThresholdExpressionMetric,
} from '../../../../common/custom_threshold_rule/types';

export interface CustomThresholdPrefillOptions {
  groupBy?: string[];
  filterQuery: string | undefined;
  metrics: CustomThresholdExpressionMetric[];
}

export const useCustomThresholdAlertPrefill = () => {
  const [prefillOptionsState, setPrefillOptionsState] = useState<CustomThresholdPrefillOptions>({
    groupBy: undefined,
    filterQuery: undefined,
    metrics: [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
    ],
  });

  const { groupBy, filterQuery, metrics } = prefillOptionsState;

  return {
    groupBy,
    filterQuery,
    metrics,
    setPrefillOptions(newState: CustomThresholdPrefillOptions) {
      if (!isEqual(newState, prefillOptionsState)) setPrefillOptionsState(newState);
    },
  };
};
