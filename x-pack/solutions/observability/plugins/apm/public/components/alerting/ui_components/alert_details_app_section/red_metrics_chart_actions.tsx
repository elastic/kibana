/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import type { ApmPluginStartDeps } from '../../../../plugin';
import type { ESQLQueryParams } from '../../../shared/links/discover_links/get_esql_query';
import { getESQLQuery } from '../../../shared/links/discover_links/get_esql_query';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';

const openLabel = i18n.translate('xpack.apm.alertDetails.chartActions.open', {
  defaultMessage: 'Open',
});

const inApmLabel = i18n.translate('xpack.apm.alertDetails.chartActions.inApm', {
  defaultMessage: 'In APM',
});

const tracesInDiscoverLabel = i18n.translate(
  'xpack.apm.alertDetails.chartActions.tracesInDiscover',
  {
    defaultMessage: 'Traces in Discover',
  }
);

interface RedMetricsChartActionsProps {
  queryParams: Pick<
    ESQLQueryParams,
    'serviceName' | 'environment' | 'transactionName' | 'transactionType' | 'kuery'
  >;
  timeRange: { from: string; to: string };
  ruleTypeId?: string;
}

export function RedMetricsChartActions(props: RedMetricsChartActionsProps) {
  const {
    services: { share, apmSourcesAccess },
  } = useKibana<ApmPluginStartDeps>();

  const apmLocator = share?.url?.locators?.get(APM_APP_LOCATOR_ID);

  if (!apmLocator || !apmSourcesAccess) return null;

  return (
    <RedMetricsChartActionsPopover
      {...props}
      apmLocator={apmLocator}
      apmSourcesAccess={apmSourcesAccess}
      share={share}
    />
  );
}

function RedMetricsChartActionsPopover({
  queryParams,
  timeRange,
  ruleTypeId,
  apmLocator,
  apmSourcesAccess,
  share,
}: RedMetricsChartActionsProps & {
  apmLocator: LocatorPublic<any>;
  apmSourcesAccess: ApmSourceAccessPluginStart;
  share: ApmPluginStartDeps['share'];
}) {
  const { data, status: indexSettingsStatus } = useFetcher(
    (_, signal) => apmSourcesAccess.getApmIndexSettings({ signal }),
    [apmSourcesAccess]
  );

  const indexSettings = useMemo(() => data?.apmIndexSettings ?? [], [data]);

  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const { serviceName, ...queryForApm } = queryParams;

  const apmLink = useMemo(() => {
    return apmLocator.getRedirectUrl({
      serviceName,
      serviceOverviewTab: queryParams.transactionName ? 'transactions' : undefined,
      query: {
        ...queryForApm,
        rangeFrom: timeRange.from,
        rangeTo: timeRange.to,
      },
    });
  }, [apmLocator, serviceName, queryParams.transactionName, queryForApm, timeRange]);

  const discoverLink = useMemo(() => {
    if (indexSettingsStatus !== FETCH_STATUS.SUCCESS) return undefined;

    const esqlQuery = getESQLQuery({
      indexType: 'traces',
      params: { ...queryParams, sortDirection: 'DESC' },
      indexSettings,
    });

    if (!esqlQuery) return undefined;

    const discoverLocator = share?.url?.locators?.get(DISCOVER_APP_LOCATOR);

    return discoverLocator?.getRedirectUrl({
      timeRange,
      query: { esql: esqlQuery },
    });
  }, [share, indexSettingsStatus, queryParams, indexSettings, timeRange]);

  return (
    <EuiPopover
      aria-label={openLabel}
      button={
        <EuiButtonEmpty
          data-test-subj="apmAlertDetailsOpenActionsDropdown"
          onClick={() => setIsActionsOpen(!isActionsOpen)}
          iconType="arrowDown"
          iconSide="right"
          size="s"
        >
          {openLabel}
        </EuiButtonEmpty>
      }
      isOpen={isActionsOpen}
      closePopover={() => setIsActionsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel>
        <EuiContextMenuItem
          href={apmLink}
          disabled={!apmLink}
          data-test-subj="apmAlertDetailsOpenInApmAction"
          data-action="openInApm"
          data-source={`alertDetails-${ruleTypeId}`}
        >
          {inApmLabel}
        </EuiContextMenuItem>
        <EuiContextMenuItem
          href={discoverLink}
          disabled={!discoverLink}
          data-test-subj="apmAlertDetailsTracesOpenInDiscoverAction"
          data-action="openTracesInDiscover"
          data-source={`alertDetails-${ruleTypeId}`}
        >
          {tracesInDiscoverLabel}
        </EuiContextMenuItem>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
}
