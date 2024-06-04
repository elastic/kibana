/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { LogsExplorerPublicState } from '@kbn/logs-explorer-plugin/public';
import { getRouterLinkProps } from '@kbn/router-utils';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import { MatchedStateFromActor } from '@kbn/xstate-utils';
import { useActor } from '@xstate/react';
import React from 'react';
import { DataQualityLocatorParams, DATA_QUALITY_LOCATOR_ID } from '@kbn/data-quality-plugin/common';
import { datasetQualityLinkTitle } from '../../common/translations';
import {
  ObservabilityLogsExplorerService,
  useObservabilityLogsExplorerPageStateContext,
} from '../state_machines/observability_logs_explorer/src';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export const ConnectedDatasetQualityLink = React.memo(() => {
  const {
    services: {
      share: { url },
    },
  } = useKibanaContextForPlugin();
  const [pageState] = useActor(useObservabilityLogsExplorerPageStateContext());

  if (pageState.matches({ initialized: 'validLogsExplorerState' })) {
    return <DatasetQualityLink urlService={url} pageState={pageState} />;
  } else {
    return <DatasetQualityLink urlService={url} />;
  }
});

type InitializedPageState = MatchedStateFromActor<
  ObservabilityLogsExplorerService,
  { initialized: 'validLogsExplorerState' }
>;

const constructLocatorParams = (
  logsExplorerState: LogsExplorerPublicState
): DataQualityLocatorParams => {
  const { time, refreshInterval } = logsExplorerState;
  const locatorParams: DataQualityLocatorParams = {
    filters: {
      timeRange: {
        from: time?.from || 'now-24h',
        to: time?.to || 'now',
        refresh: {
          pause: refreshInterval ? refreshInterval.pause : false,
          value: refreshInterval ? refreshInterval.value : 60000,
        },
      },
    },
  };

  return locatorParams;
};

export const DatasetQualityLink = React.memo(
  ({
    urlService,
    pageState,
  }: {
    urlService: BrowserUrlService;
    pageState?: InitializedPageState;
  }) => {
    const locator = urlService.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);

    const locatorParams: DataQualityLocatorParams = pageState
      ? constructLocatorParams(pageState.context.logsExplorerState)
      : {};

    const datasetQualityUrl = locator?.getRedirectUrl(locatorParams);

    const navigateToDatasetQuality = () => {
      locator?.navigate(locatorParams);
    };

    const datasetQualityLinkProps = getRouterLinkProps({
      href: datasetQualityUrl,
      onClick: navigateToDatasetQuality,
    });

    return (
      <EuiHeaderLink
        {...datasetQualityLinkProps}
        color="primary"
        data-test-subj="logsExplorerDatasetQualityLink"
      >
        {datasetQualityLinkTitle}
      </EuiHeaderLink>
    );
  }
);
