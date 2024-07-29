/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartSizeArray } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

export const CHART_DIRECTION = {
  FORWARD: 'forward',
  BACK: 'back',
} as const;
export type ChartDirectionType = (typeof CHART_DIRECTION)[keyof typeof CHART_DIRECTION];

// [width, height]
export const CHART_SIZE: ChartSizeArray = ['100%', 380];

export const TAB_IDS = {
  CHART: 'chart',
  MESSAGES: 'messages',
} as const;
export type TabIdsType = (typeof TAB_IDS)[keyof typeof TAB_IDS];

export const tabs = [
  {
    id: TAB_IDS.CHART,
    name: i18n.translate('xpack.ml.jobsList.datafeedChart.chartTabName', {
      defaultMessage: 'Chart',
    }),
    disabled: false,
  },
  {
    id: TAB_IDS.MESSAGES,
    name: i18n.translate('xpack.ml.jobsList.datafeedChart.messagesTabName', {
      defaultMessage: 'Messages',
    }),
    disabled: false,
  },
];
