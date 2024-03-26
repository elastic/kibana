/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, formatNumber } from '@elastic/eui';

import { _IGNORED } from '../../../../common/es_fields';
import { BYTE_NUMBER_FORMAT, NUMBER_FORMAT } from '../../../../common/constants';
import {
  flyoutDegradedDocsText,
  flyoutDocsCountTotalText,
  flyoutHostsText,
  flyoutServicesText,
  flyoutShowAllText,
  flyoutSizeText,
} from '../../../../common/translations';
import { DataStreamDetails } from '../../../../common/api_types';
import { useLinkToLogsExplorer } from '../../../hooks';
import { FlyoutDataset } from '../../../state_machines/dataset_quality_controller';
import { FlyoutSummaryKpiItem, FlyoutSummaryKpiItemLoading } from './flyout_summary_kpi_item';

export function FlyoutSummaryKpis({
  dataStreamStat,
  dataStreamDetails,
  isLoading,
}: {
  dataStreamStat: FlyoutDataset;
  dataStreamDetails?: DataStreamDetails;
  isLoading: boolean;
}) {
  const logsExplorerLinkProps = useLinkToLogsExplorer({
    dataStreamStat,
    query: { language: 'kuery', query: `${_IGNORED}: *` },
  });

  const kpis = useMemo(
    () => getSummaryKpis(dataStreamDetails, logsExplorerLinkProps.href),
    [dataStreamDetails, logsExplorerLinkProps]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup wrap={true} gutterSize="m">
        {kpis.map((kpi) => (
          <EuiFlexItem key={kpi.title}>
            <FlyoutSummaryKpiItem {...kpi} isLoading={isLoading} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

export function FlyoutSummaryKpisLoading() {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup wrap={true} gutterSize="m">
        {getSummaryKpis(undefined, undefined).map(({ title }) => (
          <EuiFlexItem key={title}>
            <FlyoutSummaryKpiItemLoading title={title} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

// dataStreamDetails.sizeBytes = null indicates it's Serverless where `_stats` API isn't available
function getSummaryKpis(
  dataStreamDetails?: DataStreamDetails,
  degradedDocsHref?: string
): Array<{ title: string; value: string; link?: { label: string; href: string } }> {
  const services = dataStreamDetails?.services ?? {};
  const serviceKeys = Object.keys(services);
  const countOfServices = serviceKeys
    .map((key: string) => services[key].length)
    .reduce((a, b) => a + b, 0);
  const servicesLink = undefined; // TODO: Add link to APM services page when possible

  const hosts = dataStreamDetails?.hosts ?? {};
  const hostKeys = Object.keys(hosts);
  const countOfHosts = hostKeys.map((key: string) => hosts[key].length).reduce((a, b) => a + b, 0);
  const hostsLink = undefined; // TODO: Add link to Infra hosts when locator is available

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
    },
    ...(dataStreamDetails?.sizeBytes !== null // Only show when not in Serverless
      ? [
          {
            title: flyoutSizeText,
            value: formatNumber(dataStreamDetails?.sizeBytes ?? 0, BYTE_NUMBER_FORMAT),
          },
        ]
      : []),
    {
      title: flyoutServicesText,
      value: formatNumber(countOfServices, NUMBER_FORMAT),
      link: servicesLink,
    },
    {
      title: flyoutHostsText,
      value: formatNumber(countOfHosts, NUMBER_FORMAT),
      link: hostsLink,
    },
    {
      title: flyoutDegradedDocsText,
      value: formatNumber(dataStreamDetails?.degradedDocsCount ?? 0, NUMBER_FORMAT),
      link: degradedDocsLink,
    },
  ];
}
