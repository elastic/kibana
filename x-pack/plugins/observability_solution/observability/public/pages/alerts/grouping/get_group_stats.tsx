/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetGroupStats } from '@kbn/grouping/src';
import { ALERT_INSTANCE_ID, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { AlertsByGroupingAgg } from '../../../components/alerts_table/types';

export const getGroupStats: GetGroupStats<AlertsByGroupingAgg> = (selectedGroup, bucket) => {
  const defaultBadges = [
    {
      title: 'Alerts:',
      badge: {
        value: bucket.doc_count,
        width: 50,
      },
    },
  ];

  switch (selectedGroup) {
    case ALERT_RULE_NAME:
      return [
        {
          title: 'Sources:',
          badge: {
            value: bucket.sourceCountAggregation?.value ?? 0,
            width: 50,
          },
        },
        ...defaultBadges,
      ];
    case ALERT_INSTANCE_ID:
      return [
        {
          title: 'Rules:',
          badge: {
            value: bucket.rulesCountAggregation?.value ?? 0,
            width: 50,
          },
        },
        ...defaultBadges,
      ];
  }
  return [
    {
      title: 'Rules:',
      badge: {
        value: bucket.rulesCountAggregation?.value ?? 0,
        width: 50,
      },
    },
    ...defaultBadges,
  ];
};
