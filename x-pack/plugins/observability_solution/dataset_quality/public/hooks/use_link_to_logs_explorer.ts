/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SINGLE_DATASET_LOCATOR_ID,
  SingleDatasetLocatorParams,
} from '@kbn/deeplinks-observability';
import { Query, AggregateQuery } from '@kbn/es-query';
import { getRouterLinkProps } from '@kbn/router-utils';
import { useSelector } from '@xstate/react';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { FlyoutDataset } from '../state_machines/dataset_quality_controller';
import { useKibanaContextForPlugin } from '../utils';

export const useLinkToLogsExplorer = ({
  dataStreamStat,
  query,
}: {
  dataStreamStat: DataStreamStat | FlyoutDataset;
  query?: Query | AggregateQuery;
}) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const { service } = useDatasetQualityContext();
  const {
    timeRange: { from, to },
  } = useSelector(service, (state) => state.context.filters);

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
  };

  const singleDatasetLocator =
    share.url.locators.get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID);

  const urlToLogsExplorer = singleDatasetLocator?.getRedirectUrl(params);

  const navigateToLogsExplorer = () => {
    singleDatasetLocator?.navigate(params) as Promise<void>;
  };

  const logsExplorerLinkProps = getRouterLinkProps({
    href: urlToLogsExplorer,
    onClick: navigateToLogsExplorer,
  });

  return logsExplorerLinkProps;
};
