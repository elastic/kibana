/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import type {
  BadgeMetric,
  CustomMetric,
} from '../../../../common/components/grouping/accordion_panel';
import type { RawBucket } from '../../../../common/components/grouping';
import * as i18n from '../translations';

const getSingleGroupSeverity = (severity?: string) => {
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

export const getSelectedGroupBadgeMetrics = (
  selectedGroup: string,
  bucket: RawBucket
): BadgeMetric[] => {
  const defaultBadges = [
    {
      title: i18n.STATS_GROUP_ALERTS,
      value: bucket.doc_count,
      width: 50,
      color: '#a83632',
    },
  ];
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return [
        {
          title: i18n.STATS_GROUP_USERS,
          value: bucket.usersCountAggregation?.value ?? 0,
        },
        {
          title: i18n.STATS_GROUP_HOSTS,
          value: bucket.hostsCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
    case 'host.name':
      return [
        {
          title: i18n.STATS_GROUP_USERS,
          value: bucket.usersCountAggregation?.value ?? 0,
        },
        {
          title: i18n.STATS_GROUP_RULES,
          value: bucket.rulesCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
    case 'user.name':
      return [
        {
          title: i18n.STATS_GROUP_IPS,
          value: bucket.hostsCountAggregation?.value ?? 0,
        },
        {
          title: i18n.STATS_GROUP_RULES,
          value: bucket.rulesCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
    case 'source.ip':
      return [
        {
          title: i18n.STATS_GROUP_IPS,
          value: bucket.hostsCountAggregation?.value ?? 0,
        },
        {
          title: i18n.STATS_GROUP_RULES,
          value: bucket.rulesCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
  }
  return [
    {
      title: i18n.STATS_GROUP_RULES,
      value: bucket.rulesCountAggregation?.value ?? 0,
    },
    ...defaultBadges,
  ];
};

export const getSelectedGroupCustomMetrics = (
  selectedGroup: string,
  bucket: RawBucket
): CustomMetric[] => {
  const singleSeverityComponent =
    bucket.severitiesSubAggregation?.buckets && bucket.severitiesSubAggregation?.buckets?.length
      ? getSingleGroupSeverity(bucket.severitiesSubAggregation?.buckets[0].key.toString())
      : null;
  const severityComponent =
    bucket.countSeveritySubAggregation?.value && bucket.countSeveritySubAggregation?.value > 1
      ? multiSeverity
      : singleSeverityComponent;
  if (!severityComponent) {
    return [];
  }
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return [
        {
          title: i18n.STATS_GROUP_SEVERITY,
          customStatRenderer: severityComponent,
        },
      ];
    case 'host.name':
      return [
        {
          title: i18n.STATS_GROUP_SEVERITY,
          customStatRenderer: severityComponent,
        },
      ];
    case 'user.name':
      return [
        {
          title: i18n.STATS_GROUP_SEVERITY,
          customStatRenderer: severityComponent,
        },
      ];
  }
  return [];
};
