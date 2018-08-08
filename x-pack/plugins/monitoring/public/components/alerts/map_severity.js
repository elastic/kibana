/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize } from 'lodash';

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
export function mapSeverity(severity) {
  const floor = Math.floor(severity / 1000);
  let mapped;

  switch (floor) {
    case 0:
      mapped = { value: 'low', color: 'warning', iconType: 'dot' };
      break;
    case 1:
      mapped = { value: 'medium', color: 'warning', iconType: 'dot' };
      break;
    default: // severity >= 2000
      mapped = { value: 'high', color: 'danger', iconType: 'dot' };
      break;
  }

  return {
    title: `${capitalize(mapped.value)} severity alert`,
    ...mapped
  };
}