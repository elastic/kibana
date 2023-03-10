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

export const ACTIVE_COLOR = '#bd271e';
export const RECOVERED_COLOR = '#6eccb1';
export const ALL_COLOR = '#6092c0';
export const FLAPPING_COLOR = '#ff7e62';

const getSingleGroupStatus = (status?: string) => {
  switch (status) {
    case 'active':
      return (
        <>
          <EuiIcon type="dot" color={ACTIVE_COLOR} />
          {`Active`}
        </>
      );
    case 'recovered':
      return (
        <>
          <EuiIcon type="dot" color={RECOVERED_COLOR} />
          {`Recovered`}
        </>
      );
    case 'flapping':
      return (
        <>
          <EuiIcon type="dot" color={FLAPPING_COLOR} />
          {`Flapping`}
        </>
      );
  }
  return (
    <>
      <EuiIcon type="dot" color={ALL_COLOR} />
      {`All`}
    </>
  );
};

const multiStatus = (
  <>
    <span className="smallDot">
      <EuiIcon type="dot" color={ACTIVE_COLOR} />
    </span>
    <span className="smallDot">
      <EuiIcon type="dot" color={FLAPPING_COLOR} />
    </span>
    <span className="smallDot">
      <EuiIcon type="dot" color={RECOVERED_COLOR} />
    </span>
    <span>
      <EuiIcon type="dot" color={ALL_COLOR} />
    </span>
    {`Multiple`}
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
          title: `Agents`,
          value: bucket.agentCountAggregation?.value ?? 0,
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
          title: `Host IPs`,
          value: bucket.hostIpCountAggregation?.value ?? 0,
        },
        {
          title: `Log Entries`,
          value: bucket.logSumAggregation?.value ?? 0,
        },
        ...defaultBadges,
      ];
    case 'kibana.alert.rule.category':
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
    case 'agent.name':
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
  const singleStatusComponent =
    bucket.statusSubAggregation?.buckets && bucket.statusSubAggregation?.buckets?.length
      ? getSingleGroupStatus(bucket.statusSubAggregation?.buckets[0].key.toString())
      : null;
  const statusComponent =
    bucket.countStatusSubAggregation?.value && bucket.countStatusSubAggregation?.value > 1
      ? multiStatus
      : singleStatusComponent;
  if (!statusComponent) {
    return [];
  }
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return [
        {
          title: 'Status',
          customStatRenderer: statusComponent,
        },
      ];
    case 'host.name':
      return [
        {
          title: 'Status',
          customStatRenderer: statusComponent,
        },
      ];
    case 'kibana.alert.rule.category':
      return [
        {
          title: 'Status',
          customStatRenderer: statusComponent,
        },
      ];
  }
  return [];
};
