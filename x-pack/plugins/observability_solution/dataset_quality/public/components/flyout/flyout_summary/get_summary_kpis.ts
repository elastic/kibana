/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from '@elastic/eui';
import {
  BYTE_NUMBER_FORMAT,
  DEFAULT_DATEPICKER_REFRESH,
  DEFAULT_TIME_RANGE,
  MAX_HOSTS_METRIC_VALUE,
  NUMBER_FORMAT,
} from '../../../../common/constants';
import {
  flyoutDegradedDocsText,
  flyoutDocsCountTotalText,
  flyoutHostsText,
  flyoutServicesText,
  flyoutShowAllText,
  flyoutSizeText,
} from '../../../../common/translations';
import { DataStreamDetails } from '../../../../common/api_types';
import { useKibanaContextForPlugin } from '../../../utils';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';

export function getSummaryKpis({
  dataStreamDetails,
  timeRange = { ...DEFAULT_TIME_RANGE, refresh: DEFAULT_DATEPICKER_REFRESH },
  degradedDocsHref,
  hostsLocator,
}: {
  dataStreamDetails?: DataStreamDetails;
  timeRange?: TimeRangeConfig;
  degradedDocsHref?: string;
  hostsLocator?: ReturnType<
    typeof useKibanaContextForPlugin
  >['services']['observabilityShared']['locators']['infra']['hostsLocator'];
}): Array<{
  title: string;
  value: string;
  link?: { label: string; href: string };
  userHasPrivilege: boolean;
}> {
  const services = dataStreamDetails?.services ?? {};
  const serviceKeys = Object.keys(services);
  const countOfServices = serviceKeys
    .map((key: string) => services[key].length)
    .reduce((a, b) => a + b, 0);
  const servicesLink = undefined; // TODO: Add link to APM services page when possible

  const degradedDocsLink = degradedDocsHref
    ? {
        label: flyoutShowAllText,
        href: degradedDocsHref,
      }
    : undefined;

  return [
    {
      title: flyoutDocsCountTotalText,
      value: formatNumber(dataStreamDetails?.docsCount ?? 0, NUMBER_FORMAT),
      userHasPrivilege: true,
    },
    // dataStreamDetails.sizeBytes = null indicates it's Serverless where `_stats` API isn't available
    ...(dataStreamDetails?.sizeBytes !== null // Only show when not in Serverless
      ? [
          {
            title: flyoutSizeText,
            value: formatNumber(dataStreamDetails?.sizeBytes ?? 0, BYTE_NUMBER_FORMAT),
            userHasPrivilege: dataStreamDetails?.userPrivileges?.canMonitor ?? true,
          },
        ]
      : []),
    {
      title: flyoutServicesText,
      value: formatMetricValueForMax(countOfServices, MAX_HOSTS_METRIC_VALUE, NUMBER_FORMAT),
      link: servicesLink,
      userHasPrivilege: true,
    },
    getHostsKpi(dataStreamDetails?.hosts, timeRange, hostsLocator),
    {
      title: flyoutDegradedDocsText,
      value: formatNumber(dataStreamDetails?.degradedDocsCount ?? 0, NUMBER_FORMAT),
      link: degradedDocsLink,
      userHasPrivilege: true,
    },
  ];
}

function getHostsKpi(
  dataStreamHosts: DataStreamDetails['hosts'],
  timeRange: TimeRangeConfig,
  hostsLocator?: ReturnType<
    typeof useKibanaContextForPlugin
  >['services']['observabilityShared']['locators']['infra']['hostsLocator']
) {
  const hosts = dataStreamHosts ?? {};
  const hostKeys = Object.keys(hosts);
  const countOfHosts = hostKeys
    .map((key: string) => hosts[key].length)
    .reduce(
      ({ count, anyHostExceedsMax }, hostCount) => ({
        count: count + hostCount,
        anyHostExceedsMax: anyHostExceedsMax || hostCount > MAX_HOSTS_METRIC_VALUE,
      }),
      { count: 0, anyHostExceedsMax: false }
    );

  // Create a query so from hostKeys so that (key: value OR key: value2)
  const hostsKuery = hostKeys
    .filter((key) => hosts[key].length > 0)
    .map((key) => hosts[key].map((value) => `${key}: "${value}"`).join(' OR '))
    .join(' OR ');
  const hostsUrl = hostsLocator?.getRedirectUrl({
    query: { language: 'kuery', query: hostsKuery },
    dateRange: { from: timeRange.from, to: timeRange.to },
    limit: countOfHosts.count,
  });

  // @ts-ignore // TODO: Add link to Infra Hosts page when possible
  const hostsLink = hostsUrl
    ? {
        label: flyoutShowAllText,
        href: hostsUrl,
      }
    : undefined;

  return {
    title: flyoutHostsText,
    value: formatMetricValueForMax(
      countOfHosts.anyHostExceedsMax ? countOfHosts.count + 1 : countOfHosts.count,
      countOfHosts.count,
      NUMBER_FORMAT
    ),
    link: undefined,
    userHasPrivilege: true,
  };
}

/**
 * Formats a metric value to show a '+' sign if it's above a max value e.g. 50+
 */
function formatMetricValueForMax(value: number, max: number, numberFormat: string): string {
  const exceedsMax = value > max;
  const valueToShow = exceedsMax ? max : value;
  return `${formatNumber(valueToShow, numberFormat)}${exceedsMax ? '+' : ''}`;
}
