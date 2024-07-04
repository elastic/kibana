/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  SINGLE_DATASET_LOCATOR_ID,
  SingleDatasetLocatorParams,
} from '@kbn/deeplinks-observability';
import { DiscoverAppLocatorParams, DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { Query, AggregateQuery, buildPhraseFilter } from '@kbn/es-query';
import { getRouterLinkProps } from '@kbn/router-utils';
import { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { LocatorClient } from '@kbn/shared-ux-prompt-no-data-views-types';
import { useSelector } from '@xstate/react';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { FlyoutDataset, TimeRangeConfig } from '../state_machines/dataset_quality_controller';
import { useKibanaContextForPlugin } from '../utils';
import { useRedirectLinkTelemetry } from './use_telemetry';

export const useRedirectLink = ({
  dataStreamStat,
  query,
  timeRangeConfig,
  breakdownField,
  telemetry,
}: {
  dataStreamStat: DataStreamStat | FlyoutDataset;
  query?: Query | AggregateQuery;
  timeRangeConfig?: TimeRangeConfig;
  breakdownField?: string;
  telemetry?: Parameters<typeof useRedirectLinkTelemetry>[0]['telemetry'];
}) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const { service } = useDatasetQualityContext();
  const { timeRange } = useSelector(service, (state) => state.context.filters);
  const { from, to } = timeRangeConfig || timeRange;

  const logsExplorerLocator =
    share.url.locators.get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID);

  const { sendTelemetry } = useRedirectLinkTelemetry({
    rawName: dataStreamStat.rawName,
    isLogsExplorer: !!logsExplorerLocator,
    telemetry,
    query,
  });

  return useMemo<{
    linkProps: RouterLinkProps;
    navigate: () => void;
    isLogsExplorerAvailable: boolean;
  }>(() => {
    const config = logsExplorerLocator
      ? buildLogsExplorerConfig({
          locator: logsExplorerLocator,
          dataStreamStat,
          query,
          from,
          to,
          breakdownField,
        })
      : buildDiscoverConfig({
          locatorClient: share.url.locators,
          dataStreamStat,
          query,
          from,
          to,
          breakdownField,
        });

    const onClickWithTelemetry = (event: Parameters<RouterLinkProps['onClick']>[0]) => {
      sendTelemetry();
      if (config.routerLinkProps.onClick) {
        config.routerLinkProps.onClick(event);
      }
    };

    const navigateWithTelemetry = () => {
      sendTelemetry();
      config.navigate();
    };

    return {
      linkProps: {
        ...config.routerLinkProps,
        onClick: onClickWithTelemetry,
      },
      navigate: navigateWithTelemetry,
      isLogsExplorerAvailable: !!logsExplorerLocator,
    };
  }, [
    breakdownField,
    dataStreamStat,
    from,
    to,
    logsExplorerLocator,
    query,
    sendTelemetry,
    share.url.locators,
  ]);
};

const buildLogsExplorerConfig = ({
  locator,
  dataStreamStat,
  query,
  from,
  to,
  breakdownField,
}: {
  locator: LocatorPublic<SingleDatasetLocatorParams>;
  dataStreamStat: DataStreamStat | FlyoutDataset;
  query?: Query | AggregateQuery;
  from: string;
  to: string;
  breakdownField?: string;
}): {
  navigate: () => void;
  routerLinkProps: RouterLinkProps;
} => {
  const params: SingleDatasetLocatorParams = {
    dataset: dataStreamStat.name,
    timeRange: {
      from,
      to,
    },
    integration: dataStreamStat.integration?.name,
    query,
    filterControls: {
      namespace: {
        mode: 'include',
        values: [dataStreamStat.namespace],
      },
    },
    breakdownField,
  };

  const urlToLogsExplorer = locator.getRedirectUrl(params);

  const navigateToLogsExplorer = () => {
    locator.navigate(params) as Promise<void>;
  };

  const logsExplorerLinkProps = getRouterLinkProps({
    href: urlToLogsExplorer,
    onClick: navigateToLogsExplorer,
  });

  return { routerLinkProps: logsExplorerLinkProps, navigate: navigateToLogsExplorer };
};

const buildDiscoverConfig = ({
  locatorClient,
  dataStreamStat,
  query,
  from,
  to,
  breakdownField,
}: {
  locatorClient: LocatorClient;
  dataStreamStat: DataStreamStat | FlyoutDataset;
  query?: Query | AggregateQuery;
  from: string;
  to: string;
  breakdownField?: string;
}): {
  navigate: () => void;
  routerLinkProps: RouterLinkProps;
} => {
  const dataViewId = `${dataStreamStat.type}-${dataStreamStat.name}-*`;
  const dataViewTitle = dataStreamStat.integration
    ? `[${dataStreamStat.integration.title}] ${dataStreamStat.name}`
    : `${dataViewId}`;

  const params: DiscoverAppLocatorParams = {
    timeRange: {
      from,
      to,
    },
    refreshInterval: {
      pause: true,
      value: 60000,
    },
    dataViewId,
    dataViewSpec: {
      id: dataViewId,
      title: dataViewTitle,
    },
    query,
    breakdownField,
    columns: ['@timestamp', 'message'],
    filters: [
      buildPhraseFilter(
        {
          name: 'data_stream.namespace',
          type: 'string',
        },
        dataStreamStat.namespace,
        {
          id: dataViewId,
          title: dataViewTitle,
        }
      ),
    ],
    interval: 'auto',
    sort: [['@timestamp', 'desc']],
  };

  const locator = locatorClient.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  const urlToDiscover = locator?.getRedirectUrl(params);

  const navigateToDiscover = () => {
    locator?.navigate(params) as Promise<void>;
  };

  const discoverLinkProps = getRouterLinkProps({
    href: urlToDiscover,
    onClick: navigateToDiscover,
  });

  return { routerLinkProps: discoverLinkProps, navigate: navigateToDiscover };
};
