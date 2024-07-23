/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from '@elastic/eui';
import { getRouterLinkProps, RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
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
import { NavigationTarget, NavigationSource } from '../../../services/telemetry';
import { useKibanaContextForPlugin } from '../../../utils';
import type { useRedirectLink, useDatasetDetailsTelemetry } from '../../../hooks';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';

export function getSummaryKpis({
  dataStreamDetails,
  timeRange = { ...DEFAULT_TIME_RANGE, refresh: DEFAULT_DATEPICKER_REFRESH },
  degradedDocsLinkProps,
  hostsLocator,
  telemetry,
}: {
  dataStreamDetails?: DataStreamDetails;
  timeRange?: TimeRangeConfig;
  degradedDocsLinkProps?: ReturnType<typeof useRedirectLink>;
  hostsLocator?: ReturnType<
    typeof useKibanaContextForPlugin
  >['services']['observabilityShared']['locators']['infra']['hostsLocator'];
  telemetry: ReturnType<typeof useDatasetDetailsTelemetry>;
}): Array<{
  title: string;
  value: string;
  link?: { label: string; props: RouterLinkProps };
  userHasPrivilege: boolean;
}> {
  const services = dataStreamDetails?.services ?? {};
  const serviceKeys = Object.keys(services);
  const countOfServices = serviceKeys
    .map((key: string) => services[key].length)
    .reduce((a, b) => a + b, 0);

  // @ts-ignore // TODO: Add link to APM services page when possible - https://github.com/elastic/kibana/issues/179904
  const servicesLink = {
    label: flyoutShowAllText,
    props: getRouterLinkProps({
      href: undefined,
      onClick: () => {
        telemetry.trackDetailsNavigated(NavigationTarget.Services, NavigationSource.Summary);
      },
    }),
  };

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
      link: undefined,
      userHasPrivilege: true,
    },
    getHostsKpi(dataStreamDetails?.hosts, timeRange, telemetry, hostsLocator),
    {
      title: flyoutDegradedDocsText,
      value: formatNumber(dataStreamDetails?.degradedDocsCount ?? 0, NUMBER_FORMAT),
      link:
        degradedDocsLinkProps && degradedDocsLinkProps.linkProps.href
          ? {
              label: flyoutShowAllText,
              props: degradedDocsLinkProps.linkProps,
            }
          : undefined,
      userHasPrivilege: true,
    },
  ];
}

function getHostsKpi(
  dataStreamHosts: DataStreamDetails['hosts'],
  timeRange: TimeRangeConfig,
  telemetry: ReturnType<typeof useDatasetDetailsTelemetry>,
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
  const hostsLink = {
    label: flyoutShowAllText,
    props: getRouterLinkProps({
      href: hostsUrl,
      onClick: () => {
        telemetry.trackDetailsNavigated(NavigationTarget.Hosts, NavigationSource.Summary);
      },
    }),
  };

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
