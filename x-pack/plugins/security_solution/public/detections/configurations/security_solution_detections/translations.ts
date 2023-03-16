/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SUPPRESSED_ALERT_TOOLTIP = (numAlertsSuppressed: number) =>
  i18n.translate('xpack.securitySolution.configurations.suppressedAlerts', {
    defaultMessage: 'Alert has {numAlertsSuppressed} suppressed alerts',
    values: { numAlertsSuppressed },
  });

/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_TABLE_COLUMN_MIN_WIDTH = 180; // px

/** The default minimum width of a column of type `date` */
export const DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH = 190; // px
