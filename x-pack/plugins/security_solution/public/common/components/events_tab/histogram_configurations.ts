/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import numeral from '@elastic/numeral';

import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { getExternalAlertLensAttributes } from '../visualization_actions/lens_attributes/common/external_alert';
import { getEventsHistogramLensAttributes } from '../visualization_actions/lens_attributes/common/events';
import type { MatrixHistogramConfigs, MatrixHistogramOption } from '../matrix_histogram/types';
import * as i18n from './translations';

const DEFAULT_EVENTS_STACK_BY = 'event.action';

export const getSubtitleFunction =
  (defaultNumberFormat: string, isAlert: boolean) => (totalCount: number) =>
    `${i18n.SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${
      isAlert ? i18n.EXTERNAL_ALERTS_UNIT(totalCount) : i18n.EVENTS_UNIT(totalCount)
    }`;

export const eventsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.action',
    value: 'event.action',
  },
  {
    text: 'event.dataset',
    value: 'event.dataset',
  },
  {
    text: 'event.module',
    value: 'event.module',
  },
];

export const eventsHistogramConfig: MatrixHistogramConfigs = {
  defaultStackByOption:
    eventsStackByOptions.find((o) => o.text === DEFAULT_EVENTS_STACK_BY) ?? eventsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_EVENTS_DATA,
  histogramType: MatrixHistogramType.events,
  stackByOptions: eventsStackByOptions,
  subtitle: undefined,
  title: i18n.EVENTS_GRAPH_TITLE,
  getLensAttributes: getEventsHistogramLensAttributes,
};

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

export const alertsHistogramConfig: MatrixHistogramConfigs = {
  defaultStackByOption:
    alertsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? alertsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_ALERTS_DATA,
  histogramType: MatrixHistogramType.alerts,
  stackByOptions: alertsStackByOptions,
  subtitle: undefined,
  title: i18n.ALERTS_GRAPH_TITLE,
  getLensAttributes: getExternalAlertLensAttributes,
};
