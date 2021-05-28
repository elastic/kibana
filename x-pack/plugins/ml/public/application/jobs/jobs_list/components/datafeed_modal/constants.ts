/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ChartSizeArray } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

export const CHART_DIRECTION = {
  FORWARD: 'forward',
  BACK: 'back',
} as const;
export type ChartDirectionType = typeof CHART_DIRECTION[keyof typeof CHART_DIRECTION];

export const CHART_SIZE: ChartSizeArray = ['100%', 300];

export const defaultSearchQuery = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};

type MLSearchResp = Omit<estypes.SearchResponse, 'aggregations'>;

interface AggResult {
  key_as_string: string;
  key: number;
  doc_count: number;
}
export interface MLAggSearchResp extends MLSearchResp {
  aggregations: {
    doc_count_by_bucket_span: {
      buckets: AggResult[];
    };
  };
}

export const TAB_IDS = {
  CHART: 'chart',
  MESSAGES: 'messages',
} as const;
export type TabIdsType = typeof TAB_IDS[keyof typeof TAB_IDS];

export const tabs = [
  {
    id: TAB_IDS.CHART,
    name: i18n.translate('xpack.ml.jobsList.datafeedModal.chartTabName', {
      defaultMessage: 'Chart',
    }),
    disabled: false,
  },
  {
    id: TAB_IDS.MESSAGES,
    name: i18n.translate('xpack.ml.jobsList.datafeedModal.messagesTabName', {
      defaultMessage: 'Messages',
    }),
    disabled: false,
  },
];
