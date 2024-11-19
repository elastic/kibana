/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS } from '../../../../../common/constants';
import { SLOOverviewAlerts } from './slo_overview_alerts';
import { useGetSettings } from '../../../slo_settings/hooks/use_get_settings';
import { useFetchSLOsOverview } from '../../hooks/use_fetch_slos_overview';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { OverViewItem } from './overview_item';

export function SLOsOverview() {
  const { state } = useUrlSearchState();
  const { kqlQuery, filters, tagsFilter, statusFilter, lastRefresh } = state;

  const { data, isLoading } = useFetchSLOsOverview({
    kqlQuery,
    filters,
    tagsFilter,
    statusFilter,
    lastRefresh,
  });

  const theme = useEuiTheme().euiTheme;
  const { data: currentSettings } = useGetSettings();

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
        <EuiPanel hasShadow={false} hasBorder={true}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.slo.sLOsOverview.h3.overviewLabel', {
                defaultMessage: 'Overview',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xl" justifyContent="spaceBetween">
            <OverViewItem
              title={data?.healthy}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.healthyLabel', {
                defaultMessage: 'Healthy',
              })}
              titleColor="success"
              isLoading={isLoading}
              query={`status : HEALTHY`}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.healthyLabel.tooltip', {
                defaultMessage: 'Click to filter SLOs by Healthy status.',
              })}
            />
            <OverViewItem
              title={data?.violated}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.violatedLabel', {
                defaultMessage: 'Violated',
              })}
              titleColor="danger"
              query={`status : VIOLATED`}
              isLoading={isLoading}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.violatedLabel.tooltip', {
                defaultMessage: 'Click to filter SLOs by Violated status.',
              })}
            />
            <OverViewItem
              title={data?.noData}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.noDataLabel', {
                defaultMessage: 'No data',
              })}
              titleColor="subdued"
              query={`status : NO_DATA`}
              isLoading={isLoading}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.noDataLabel.tooltip', {
                defaultMessage: 'Click to filter SLOs by no data status.',
              })}
            />
            <OverViewItem
              title={data?.degrading}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.degradingLabel', {
                defaultMessage: 'Degrading',
              })}
              query={`status : DEGRADING`}
              isLoading={isLoading}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.degradingLabel.tooltip', {
                defaultMessage: 'Click to filter SLOs by Degrading status.',
              })}
              titleColor={theme.colors.warningText}
            />
            <OverViewItem
              title={data?.stale}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.staleLabel', {
                defaultMessage: 'Stale',
              })}
              titleColor="subdued"
              isLoading={isLoading}
              query={`summaryUpdatedAt < "now-${
                currentSettings?.staleThresholdInHours ?? DEFAULT_STALE_SLO_THRESHOLD_HOURS
              }h"`}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.staleLabel.tooltip', {
                defaultMessage:
                  'Click to filter SLOs which have not been updated in last {value} hour. They are filtered out by default from the list. Threshold can be changed in SLO settings.',
                values: {
                  value:
                    currentSettings?.staleThresholdInHours ?? DEFAULT_STALE_SLO_THRESHOLD_HOURS,
                },
              })}
            />
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <SLOOverviewAlerts data={data} isLoading={isLoading} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
