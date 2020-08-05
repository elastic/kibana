/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
export { AlertPreview } from './components/alert_preview';

export const previewOptions = [
  {
    value: 'h',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastHourLabel', {
      defaultMessage: 'Last hour',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.hourLabel', {
      defaultMessage: 'hour',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastDayLabel', {
      defaultMessage: 'Last day',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.dayLabel', {
      defaultMessage: 'day',
    }),
  },
  {
    value: 'w',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastWeekLabel', {
      defaultMessage: 'Last week',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.weekLabel', {
      defaultMessage: 'week',
    }),
  },
  {
    value: 'M',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastMonthLabel', {
      defaultMessage: 'Last month',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.monthLabel', {
      defaultMessage: 'month',
    }),
  },
];

export const firedTimeLabel = i18n.translate('xpack.infra.metrics.alertFlyout.firedTime', {
  defaultMessage: 'time',
});
export const firedTimesLabel = i18n.translate('xpack.infra.metrics.alertFlyout.firedTimes', {
  defaultMessage: 'times',
});
