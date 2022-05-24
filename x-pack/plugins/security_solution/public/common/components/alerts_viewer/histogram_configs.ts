/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import { MatrixHistogramOption, MatrixHistogramConfigs } from '../matrix_histogram/types';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution/matrix_histogram';
import { getExternalAlertLensAttributes } from '../visualization_actions/lens_attributes/common/external_alert';

export const alertsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.category',
    value: 'event.category',
  },
  {
    text: 'event.module',
    value: 'event.module',
  },
];

const DEFAULT_STACK_BY = 'event.module';

export const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    alertsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? alertsStackByOptions[1],
  errorMessage: i18n.ERROR_FETCHING_ALERTS_DATA,
  histogramType: MatrixHistogramType.alerts,
  stackByOptions: alertsStackByOptions,
  subtitle: undefined,
  title: i18n.ALERTS_GRAPH_TITLE,
  getLensAttributes: getExternalAlertLensAttributes,
};
