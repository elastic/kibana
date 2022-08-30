/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import type {
  MatrixHistogramOption,
  MatrixHistogramConfigs,
} from '../../../components/matrix_histogram/types';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution/matrix_histogram';

export const anomaliesStackByOptions: MatrixHistogramOption[] = [
  {
    text: i18n.ANOMALIES_STACK_BY_JOB_ID,
    value: 'job_id',
  },
];

const DEFAULT_STACK_BY = i18n.ANOMALIES_STACK_BY_JOB_ID;

export const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    anomaliesStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? anomaliesStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_ANOMALIES_DATA,
  hideHistogramIfEmpty: true,
  histogramType: MatrixHistogramType.anomalies,
  stackByOptions: anomaliesStackByOptions,
  subtitle: undefined,
  title: i18n.ANOMALIES_TITLE,
};
