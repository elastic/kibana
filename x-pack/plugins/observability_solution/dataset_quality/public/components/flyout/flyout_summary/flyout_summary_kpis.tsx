/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { _IGNORED } from '../../../../common/es_fields';

import { DataStreamDetails } from '../../../../common/api_types';
import { useKibanaContextForPlugin } from '../../../utils';
import { useRedirectLink } from '../../../hooks';
import { FlyoutDataset, TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { FlyoutSummaryKpiItem, FlyoutSummaryKpiItemLoading } from './flyout_summary_kpi_item';
import { getSummaryKpis } from './get_summary_kpis';

export function FlyoutSummaryKpis({
  dataStreamStat,
  dataStreamDetails,
  isLoading,
  timeRange,
}: {
  dataStreamStat: FlyoutDataset;
  dataStreamDetails?: DataStreamDetails;
  isLoading: boolean;
  timeRange: TimeRangeConfig;
}) {
  const {
    services: { observabilityShared },
  } = useKibanaContextForPlugin();
  const hostsLocator = observabilityShared.locators.infra.hostsLocator;

  const redirectLinkProps = useRedirectLink({
    dataStreamStat,
    query: { language: 'kuery', query: `${_IGNORED}: *` },
    timeRangeConfig: timeRange,
  });

  const kpis = useMemo(
    () =>
      getSummaryKpis({
        dataStreamDetails,
        timeRange,
        degradedDocsHref: redirectLinkProps.href,
        hostsLocator,
      }),
    [dataStreamDetails, redirectLinkProps, hostsLocator, timeRange]
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
        {getSummaryKpis({}).map(({ title }) => (
          <EuiFlexItem key={title}>
            <FlyoutSummaryKpiItemLoading title={title} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
