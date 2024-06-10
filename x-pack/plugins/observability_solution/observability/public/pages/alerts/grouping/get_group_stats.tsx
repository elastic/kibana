/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { AlertsGroupingAggregation } from '@kbn/alerts-grouping';
import { GetGroupStats } from '@kbn/grouping/src';

const getSeverity = (severity?: string) => {
  switch (severity) {
    case 'low':
      return (
        <>
          <EuiIcon type="dot" color="#54b399" />
          {'Low'}
        </>
      );
    case 'medium':
      return (
        <>
          <EuiIcon type="dot" color="#d6bf57" />
          {'Medium'}
        </>
      );
    case 'high':
      return (
        <>
          <EuiIcon type="dot" color="#da8b45" />
          {'High'}
        </>
      );
    case 'critical':
      return (
        <>
          <EuiIcon type="dot" color="#e7664c" />
          {'Critical'}
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
    {'Multi'}
  </>
);

export const getGroupStats: GetGroupStats<AlertsGroupingAggregation> = (selectedGroup, bucket) => {
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
          title: 'Severity',
          renderer: severityComponent,
        },
      ];

  const defaultBadges = [
    {
      title: 'Alerts:',
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
          title: 'Users:',
          badge: {
            value: bucket.usersCountAggregation?.value ?? 0,
          },
        },
        {
          title: 'Hosts:',
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
          title: 'Users:',
          badge: {
            value: bucket.usersCountAggregation?.value ?? 0,
          },
        },
        {
          title: 'Rules:',
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
          title: 'Hosts:',
          badge: {
            value: bucket.hostsCountAggregation?.value ?? 0,
          },
        },
        {
          title: 'Rules:',
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
          title: 'Hosts:',
          badge: {
            value: bucket.hostsCountAggregation?.value ?? 0,
          },
        },
        {
          title: 'Rules:',
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
      title: 'Rules:',
      badge: {
        value: bucket.rulesCountAggregation?.value ?? 0,
      },
    },
    ...defaultBadges,
  ];
};
