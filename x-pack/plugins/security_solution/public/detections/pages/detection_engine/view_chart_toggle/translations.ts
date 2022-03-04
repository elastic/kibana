/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HIDE_CHARTS = (chartCount: number) =>
  i18n.translate('xpack.securitySolution.components.viewChartToggle.hideChartsButtonText', {
    values: { chartCount },
    defaultMessage: 'Hide { chartCount, plural, =1 {chart} other {charts}}',
  });

export const SHOW_CHARTS = (chartCount: number) =>
  i18n.translate('xpack.securitySolution.components.viewChartToggle.showChartsButtonText', {
    values: { chartCount },
    defaultMessage: 'Show { chartCount, plural, =1 {chart} other {charts}}',
  });
