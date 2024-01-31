/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { hydrateDatasetSelection } from '@kbn/logs-explorer-plugin/common';
import {
  getDiscoverColumnsFromDisplayOptions,
  getDiscoverFiltersFromState,
} from '@kbn/logs-explorer-plugin/public';
import { getRouterLinkProps } from '@kbn/router-utils';
import { MatchedStateFromActor } from '@kbn/xstate-utils';
import { useActor } from '@xstate/react';
import React, { useMemo } from 'react';
import { discoverLinkTitle } from '../../common/translations';
import {
  ObservabilityLogExplorerService,
  useObservabilityLogExplorerPageStateContext,
} from '../state_machines/observability_log_explorer/src';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export const ConnectedDiscoverLink = React.memo(() => {
  const {
    services: { discover },
  } = useKibanaContextForPlugin();

  const [pageState] = useActor(useObservabilityLogExplorerPageStateContext());

  if (pageState.matches({ initialized: 'validLogExplorerState' })) {
    return <DiscoverLinkForValidState discover={discover} pageState={pageState} />;
  } else {
    return <DiscoverLinkForUnknownState />;
  }
});

type InitializedPageState = MatchedStateFromActor<
  ObservabilityLogExplorerService,
  { initialized: 'validLogExplorerState' }
>;

export const DiscoverLinkForValidState = React.memo(
  ({
    discover,
    pageState: {
      context: { logExplorerState },
    },
  }: {
    discover: DiscoverStart;
    pageState: InitializedPageState;
  }) => {
    const discoverLinkParams = useMemo<DiscoverAppLocatorParams>(
      () => ({
        breakdownField: logExplorerState.chart.breakdownField ?? undefined,
        columns: getDiscoverColumnsFromDisplayOptions(logExplorerState),
        filters: getDiscoverFiltersFromState(logExplorerState.filters, logExplorerState.controls),
        query: logExplorerState.query,
        refreshInterval: logExplorerState.refreshInterval,
        timeRange: logExplorerState.time,
        dataViewSpec: hydrateDatasetSelection(logExplorerState.datasetSelection).toDataviewSpec(),
      }),
      [logExplorerState]
    );

    return <DiscoverLink discover={discover} discoverLinkParams={discoverLinkParams} />;
  }
);

export const DiscoverLinkForUnknownState = React.memo(() => (
  <EuiHeaderLink
    color="primary"
    iconType="discoverApp"
    data-test-subj="logsExplorerDiscoverFallbackLink"
    disabled
  >
    {discoverLinkTitle}
  </EuiHeaderLink>
));

export const DiscoverLink = React.memo(
  ({
    discover,
    discoverLinkParams,
  }: {
    discover: DiscoverStart;
    discoverLinkParams: DiscoverAppLocatorParams;
  }) => {
    const discoverUrl = discover.locator?.getRedirectUrl(discoverLinkParams);

    const navigateToDiscover = () => {
      discover.locator?.navigate(discoverLinkParams);
    };

    const discoverLinkProps = getRouterLinkProps({
      href: discoverUrl,
      onClick: navigateToDiscover,
    });

    return (
      <EuiHeaderLink
        {...discoverLinkProps}
        color="primary"
        iconType="discoverApp"
        data-test-subj="logsExplorerDiscoverFallbackLink"
      >
        {discoverLinkTitle}
      </EuiHeaderLink>
    );
  }
);
