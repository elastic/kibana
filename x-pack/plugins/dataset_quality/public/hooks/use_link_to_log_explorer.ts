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
import { getRouterLinkProps } from '@kbn/router-utils';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { FlyoutDataset } from '../state_machines/dataset_quality_controller';
import { useKibanaContextForPlugin } from '../utils';

export const useLinkToLogExplorer = ({
  dataStreamStat,
}: {
  dataStreamStat: DataStreamStat | FlyoutDataset;
}) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const params: SingleDatasetLocatorParams = {
    dataset: dataStreamStat.name,
    timeRange: {
      from: 'now-1d',
      to: 'now',
    },
    integration: dataStreamStat.integration?.name,
    filterControls: {
      namespace: {
        mode: 'include',
        values: [dataStreamStat.namespace],
      },
    },
  };

  const singleDatasetLocator =
    share.url.locators.get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID);

  const urlToLogExplorer = singleDatasetLocator?.getRedirectUrl(params);

  const navigateToLogExplorer = () => {
    singleDatasetLocator?.navigate(params) as Promise<void>;
  };

  const logExplorerLinkProps = getRouterLinkProps({
    href: urlToLogExplorer,
    onClick: navigateToLogExplorer,
  });

  return logExplorerLinkProps;
};
