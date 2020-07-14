/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const alertFilterLabels = {
  USING: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.using', {
    defaultMessage: 'Using',
  }),

  USING_PORT: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.usingPort', {
    defaultMessage: 'Using port',
  }),

  ANY_PORT: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.anyPort', {
    defaultMessage: 'any port',
  }),

  WITH: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.with', {
    defaultMessage: 'Using',
  }),

  WITH_TAG: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.withTag', {
    defaultMessage: 'With tag',
  }),

  ANY_TAG: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.anyTag', {
    defaultMessage: 'any tag',
  }),

  OF: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.of', {
    defaultMessage: 'Of',
  }),

  OF_TYPE: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.ofType', {
    defaultMessage: 'Of type',
  }),

  ANY_TYPE: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.anyType', {
    defaultMessage: 'any type',
  }),

  FROM: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.from', {
    defaultMessage: 'From',
  }),

  FROM_LOCATION: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.fromLocation', {
    defaultMessage: 'From location',
  }),

  ANY_LOCATION: i18n.translate('xpack.uptime.alerts.monitorStatus.filters.anyLocation', {
    defaultMessage: 'any location',
  }),
};

export const statusExpLabels = {
  ENABLED_CHECKBOX: i18n.translate('xpack.uptime.alerts.monitorStatus.statusEnabledCheck.label', {
    defaultMessage: 'Status check',
  }),
};

export const timeExpLabels = {
  OPEN_TIME_POPOVER: i18n.translate(
    'xpack.uptime.alerts.monitorStatus.timerangeUnitExpression.ariaLabel',
    {
      defaultMessage: 'Open the popover for time range unit select field',
    }
  ),
  SELECT_TIME_RANGE_ARIA: i18n.translate(
    'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable',
    {
      defaultMessage: 'Selectable field for the time range units alerts should use',
    }
  ),
  SELECT_TIME_RANGE_HEADLINE: i18n.translate(
    'xpack.uptime.alerts.monitorStatus.timerangeSelectionHeader',
    {
      defaultMessage: 'Select time range unit',
    }
  ),
};
