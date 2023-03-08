/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import type { RawBucket } from '@kbn/securitysolution-grouping';
import type { AlertsGroupingAggregation } from './types';

const getSingleGroupSeverity = (severity?: string) => {
  switch (severity) {
    case 'low':
      return (
        <>
          <EuiIcon type="dot" color="#54b399" />
          {`Low`}
        </>
      );
    case 'medium':
      return (
        <>
          <EuiIcon type="dot" color="#d6bf57" />
          {`Medium`}
        </>
      );
    case 'high':
      return (
        <>
          <EuiIcon type="dot" color="#da8b45" />
          {`High`}
        </>
      );
    case 'critical':
      return (
        <>
          <EuiIcon type="dot" color="#e7664c" />
          {`Critical`}
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
    {`i18n.STATS_GROUP_SEVERITY_MULTI`}
  </>
);

export const getSelectedGroupBadgeMetrics = (
  selectedGroup: string,
  bucket: RawBucket<AlertsGroupingAggregation>
) => {
  const defaultBadges = [
    {
      title: `Alerts`,
      value: bucket.doc_count,
      width: 50,
      color: '#a83632',
    },
  ];
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return [
        {
          title: `Users`,
          value: bucket.usersCountAggregation?.value ?? 0,
        },
        {
          title: `Hosts`,
          value: bucket.hostsCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
    case 'host.name':
      return [
        {
          title: `Users`,
          value: bucket.usersCountAggregation?.value ?? 0,
        },
        {
          title: `Rules`,
          value: bucket.rulesCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
    case 'kibana.alert.rule.category':
      return [
        {
          title: `IPs`,
          value: bucket.hostsCountAggregation?.value ?? 0,
        },
        {
          title: `Rules`,
          value: bucket.rulesCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
    case 'event.action':
      return [
        {
          title: `Hosts`,
          value: bucket.hostsCountAggregation?.value ?? 0,
        },
        {
          title: `Rules`,
          value: bucket.rulesCountAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
  }
  return [
    {
      title: `Rules`,
      value: bucket.rulesCountAggregation?.value ?? 0,
    },
    ...defaultBadges,
  ];
};

export const getSelectedGroupCustomMetrics = (
  selectedGroup: string,
  bucket: RawBucket<AlertsGroupingAggregation>
) => {
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
          title: 'Severity',
          customStatRenderer: severityComponent,
        },
      ];
    case 'host.name':
      return [
        {
          title: 'Severity',
          customStatRenderer: severityComponent,
        },
      ];
    case 'kibana.alert.rule.category':
      return [
        {
          title: 'Severity',
          customStatRenderer: severityComponent,
        },
      ];
  }
  return [];
};
