/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Environment } from '../../../../common/environment_rt';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ResponsiveFlyout } from '../responsive_flyout';
import { RequestFlyoutFooter } from './footer';
import { RequestFlyoutHeader } from './header';
import { RequestFlyoutQueryControls } from './query_controls';
import { RequestFlyoutLatencyDistribution } from './latency_distribution';
import { RequestFlyoutRedMetrics } from './red_metrics';
import { RequestFlyoutTransactions } from './transactions';
import { RequestFlyoutNoMetricsMessage } from './no_metrics_message';
import { RequestFlyoutContextProvider } from './request_flyout_context';
import type { RequestFlyoutConnection } from './types';

interface RequestFlyoutProps {
  deps: {
    core: CoreStart;
    share?: SharePublicStart;
    lens?: LensPublicStart;
    dataViews?: DataViewsPublicPluginStart;
  };
  connection: RequestFlyoutConnection;
  /** Initial environment — from the host page query params. */
  initialEnvironment: Environment;
  /** Initial time range — from the host page query params. */
  initialRangeFrom: string;
  initialRangeTo: string;
  onClose: () => void;
}

export function RequestFlyout({
  deps,
  connection,
  initialEnvironment,
  initialRangeFrom,
  initialRangeTo,
  onClose,
}: RequestFlyoutProps) {
  const titleId = useGeneratedHtmlId({ prefix: 'requestFlyoutTitle' });

  // Flyout-local filter state — changes here do NOT affect the host page.
  const [environment, setEnvironment] = useState<Environment>(initialEnvironment);
  const [range, setRange] = useState({ rangeFrom: initialRangeFrom, rangeTo: initialRangeTo });
  const [refreshToken, setRefreshToken] = useState(0);
  const [latencyAggregationType, setLatencyAggregationType] = useState(LatencyAggregationType.avg);

  const { start, end } = useTimeRange(range);

  const onRefresh = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  const title = `${connection.sourceLabel} → ${connection.targetLabel}`;

  const contextValue = useMemo(
    () => ({
      deps,
      connection,
      filters: {
        environment,
        setEnvironment,
        start,
        end,
        rangeFrom: range.rangeFrom,
        rangeTo: range.rangeTo,
        setRange,
      },
      refreshToken,
      onRefresh,
    }),
    [deps, connection, environment, start, end, range, refreshToken, onRefresh]
  );

  return (
    <RequestFlyoutContextProvider value={contextValue}>
      <TimeRangeMetadataContextProvider
        uiSettings={deps.core.uiSettings}
        start={start}
        end={end}
        kuery=""
        useSpanName={false}
      >
        <ResponsiveFlyout
          data-test-subj="requestFlyout"
          flyoutMenuDisplayMode="always"
          onClose={onClose}
          ownFocus={false}
          size="m"
          paddingSize="m"
          minWidth={660}
          session="start"
          flyoutMenuProps={{ title }}
          aria-labelledby={titleId}
        >
          <RequestFlyoutHeader title={title} titleId={titleId} />

          {connection.isGrouped || connection.isMessagingConsumer ? (
            <RequestFlyoutNoMetricsMessage />
          ) : (
            <>
              <EuiFlyoutBody>
                <RequestFlyoutQueryControls />
                <EuiSpacer size="m" />
                <RequestFlyoutRedMetrics
                  latencyAggregationType={latencyAggregationType}
                  setLatencyAggregationType={setLatencyAggregationType}
                />
                <EuiSpacer size="m" />
                <RequestFlyoutLatencyDistribution />
                <EuiSpacer size="m" />
                <RequestFlyoutTransactions latencyAggregationType={latencyAggregationType} />
              </EuiFlyoutBody>
              <RequestFlyoutFooter />
            </>
          )}
        </ResponsiveFlyout>
      </TimeRangeMetadataContextProvider>
    </RequestFlyoutContextProvider>
  );
}
