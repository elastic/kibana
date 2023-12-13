/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { getRouterLinkProps } from '@kbn/router-utils';
import {
  SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { useKibanaContextForPlugin } from '../utils';

export const LogExplorerLink = React.memo(
  ({ dataStreamStat, title }: { dataStreamStat: DataStreamStat; title: string }) => {
    const {
      services: { share },
    } = useKibanaContextForPlugin();
    const [dataset, namespace] = dataStreamStat.title.split('-');
    const integration = dataStreamStat.integration?.name;

    const params = {
      dataset,
      timeRange: {
        from: 'now-1d',
        to: 'now',
      },
      integration,
      filterControls: {
        namespace: {
          mode: 'include',
          values: [namespace],
        },
      },
    } as SingleDatasetLocatorParams;

    const urlToLogExplorer = share.url.locators
      .get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID)
      ?.getRedirectUrl(params);

    const navigateToLogExplorer = () => {
      share.url.locators
        .get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID)
        ?.navigate(params) as Promise<void>;
    };

    const logExplorerLinkProps = getRouterLinkProps({
      href: urlToLogExplorer,
      onClick: navigateToLogExplorer,
    });

    return <EuiLink {...logExplorerLinkProps}>{title}</EuiLink>;
  }
);
