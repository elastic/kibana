/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import type { RawBucket, GroupStatsItem } from '@kbn/grouping';
import type { AlertsGroupingAggregation } from './types';
import * as i18n from '../translations';

const getSeverity = (severity?: string) => {
  switch (severity) {
    case 'low':
      return (
        <>
          <EuiIcon type="dot" color="#54b399" />
          {i18n.STATS_GROUP_SEVERITY_LOW}
        </>
      );
    case 'medium':
      return (
        <>
          <EuiIcon type="dot" color="#d6bf57" />
          {i18n.STATS_GROUP_SEVERITY_MEDIUM}
        </>
      );
    case 'high':
      return (
        <>
          <EuiIcon type="dot" color="#da8b45" />
          {i18n.STATS_GROUP_SEVERITY_HIGH}
        </>
      );
    case 'critical':
      return (
        <>
          <EuiIcon type="dot" color="#e7664c" />
          {i18n.STATS_GROUP_SEVERITY_CRITICAL}
        </>
      );
  }
  return null;
};

const multiSeverity = (
  <>
    <span className="smallDot">
      <EuiIcon type="dot" color="#54b399" />
    </span>
    <span className="smallDot">
      <EuiIcon type="dot" color="#d6bf57" />
    </span>
    <span className="smallDot">
      <EuiIcon type="dot" color="#da8b45" />
    </span>

    <span>
      <EuiIcon type="dot" color="#e7664c" />
    </span>
    {i18n.STATS_GROUP_SEVERITY_MULTI}
  </>
);

export const getStats = (
  selectedGroup: string,
  bucket: RawBucket<AlertsGroupingAggregation>
): GroupStatsItem[] => {
  const singleSeverityComponent =
    bucket.severitiesSubAggregation?.buckets && bucket.severitiesSubAggregation?.buckets?.length
      ? getSeverity(bucket.severitiesSubAggregation?.buckets[0].key.toString())
      : null;
  const severityComponent =
    bucket.countSeveritySubAggregation?.value && bucket.countSeveritySubAggregation?.value > 1
      ? multiSeverity
      : singleSeverityComponent;

  const severityStat = !severityComponent
    ? []
    : [
        {
          title: i18n.STATS_GROUP_SEVERITY,
          renderer: severityComponent,
        },
      ];

  const defaultBadges = [
    {
      title: i18n.STATS_GROUP_ALERTS,
      badge: {
        value: bucket.doc_count,
        width: 50,
        color: '#a83632',
      },
    },
  ];

  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return [
        ...severityStat,
        {
          title: i18n.STATS_GROUP_USERS,
          badge: {
            value: bucket.usersCountAggregation?.value ?? 0,
          },
        },
        {
          title: i18n.STATS_GROUP_HOSTS,
          badge: {
            value: bucket.hostsCountAggregation?.value ?? 0,
          },
        },
        ...defaultBadges,
      ];
    case 'host.name':
      return [
        ...severityStat,
        {
          title: i18n.STATS_GROUP_USERS,
          badge: {
            value: bucket.usersCountAggregation?.value ?? 0,
          },
        },
        {
          title: i18n.STATS_GROUP_RULES,
          badge: {
            value: bucket.rulesCountAggregation?.value ?? 0,
          },
        },
        ...defaultBadges,
      ];
    case 'user.name':
      return [
        ...severityStat,
        {
          title: i18n.STATS_GROUP_HOSTS,
          badge: {
            value: bucket.hostsCountAggregation?.value ?? 0,
          },
        },
        {
          title: i18n.STATS_GROUP_RULES,
          badge: {
            value: bucket.rulesCountAggregation?.value ?? 0,
          },
        },
        ...defaultBadges,
      ];
    case 'source.ip':
      return [
        ...severityStat,
        {
          title: i18n.STATS_GROUP_HOSTS,
          badge: {
            value: bucket.hostsCountAggregation?.value ?? 0,
          },
        },
        {
          title: i18n.STATS_GROUP_RULES,
          badge: {
            value: bucket.rulesCountAggregation?.value ?? 0,
          },
        },
        ...defaultBadges,
      ];
  }
  return [
    ...severityStat,
    {
      title: i18n.STATS_GROUP_RULES,
      badge: {
        value: bucket.rulesCountAggregation?.value ?? 0,
      },
    },
    ...defaultBadges,
  ];
};
