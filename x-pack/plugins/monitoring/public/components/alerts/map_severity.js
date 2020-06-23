/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { upperFirst } from 'lodash';

/**
 * Map the {@code severity} value to the associated alert level to be usable within the UI.
 *
 * <ol>
 * <li>Low: [0, 999) represents an informational level alert.</li>
 * <li>Medium: [1000, 1999) represents a warning level alert.</li>
 * <li>High: Any other value.</li>
 * </ol>
 *
 * The object returned is in the form of:
 *
 * <code>
 * {
 *   value: 'medium',
 *   color: 'warning',
 *   iconType: 'dot',
 *   title: 'Warning severity alert'
 * }
 * </code>
 *
 * @param {Number} severity The number representing the severity. Higher is "worse".
 * @return {Object} An object containing details about the severity.
 */

import { i18n } from '@kbn/i18n';

export function mapSeverity(severity) {
  const floor = Math.floor(severity / 1000);
  let mapped;

  switch (floor) {
    case 0:
      mapped = {
        value: i18n.translate('xpack.monitoring.alerts.lowSeverityName', { defaultMessage: 'low' }),
        color: 'warning',
        iconType: 'iInCircle',
      };
      break;
    case 1:
      mapped = {
        value: i18n.translate('xpack.monitoring.alerts.mediumSeverityName', {
          defaultMessage: 'medium',
        }),
        color: 'warning',
        iconType: 'alert',
      };
      break;
    default:
      // severity >= 2000
      mapped = {
        value: i18n.translate('xpack.monitoring.alerts.highSeverityName', {
          defaultMessage: 'high',
        }),
        color: 'danger',
        iconType: 'bell',
      };
      break;
  }

  return {
    title: i18n.translate('xpack.monitoring.alerts.severityTitle', {
      defaultMessage: '{severity} severity alert',
      values: { severity: upperFirst(mapped.value) },
    }),
    ...mapped,
  };
}
