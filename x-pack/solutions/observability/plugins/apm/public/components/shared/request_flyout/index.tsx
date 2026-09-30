/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Environment } from '../../../../common/environment_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ResponsiveFlyout } from '../responsive_flyout';
import { RequestFlyoutFooter } from './footer';
import { RequestFlyoutHeader } from './header';
import { RequestFlyoutLatencyDistribution } from './latency_distribution';
import { RequestFlyoutRedMetrics } from './red_metrics';
import { RequestFlyoutOperations } from './operations';
import { RequestFlyoutAffectedEndpoints } from './transactions';
import { RequestFlyoutNoMetricsMessage } from './no_metrics_message';
import { RequestFlyoutContextProvider } from './request_flyout_context';
import type { RequestFlyoutConnection } from './types';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { LatencyAggregationType as LatencyAggregationTypeEnum } from '../../../../common/latency_aggregation_types';

type TabId = 'operations' | 'affectedEndpoints';

interface RequestFlyoutProps {
  deps: {
    core: CoreStart;
    share?: SharePublicStart;
    lens?: LensPublicStart;
    dataViews?: DataViewsPublicPluginStart;
  };
  connection: RequestFlyoutConnection;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
  onClose: () => void;
}

export function RequestFlyout({
  deps,
  connection,
  environment,
  rangeFrom,
  rangeTo,
  onClose,
}: RequestFlyoutProps) {
  const titleId = useGeneratedHtmlId({ prefix: 'requestFlyoutTitle' });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [latencyAggregationType, setLatencyAggregationType] = useState<LatencyAggregationType>(
    LatencyAggregationTypeEnum.avg
  );
  const [activeTab, setActiveTab] = useState<TabId>('operations');

  const title = `${connection.sourceLabel} → ${connection.targetLabel}`;

  const contextValue = useMemo(
    () => ({
      deps,
      connection,
      filters: {
        environment,
        start,
        end,
        rangeFrom,
        rangeTo,
      },
    }),
    [deps, connection, environment, start, end, rangeFrom, rangeTo]
  );

  const envLabel =
    environment === ENVIRONMENT_ALL
      ? i18n.translate('xpack.apm.requestFlyout.environmentAny', { defaultMessage: 'Any' })
      : environment;

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
          onClose={onClose}
          ownFocus={false}
          size="m"
          aria-labelledby={titleId}
        >
          <RequestFlyoutHeader title={title} titleId={titleId} />

          {connection.isGrouped || connection.isMessagingConsumer ? (
            <RequestFlyoutNoMetricsMessage />
          ) : (
            <>
              <EuiFlyoutBody>
                {/* Read-only time/env inherited from the map */}
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.apm.requestFlyout.inheritedFilters', {
                    defaultMessage:
                      '{rangeFrom} – {rangeTo} · Environment: {environment} · inherited from the map',
                    values: { rangeFrom, rangeTo, environment: envLabel },
                  })}
                </EuiText>

                <EuiSpacer size="m" />

                {/* Key metrics section */}
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>
                        {i18n.translate('xpack.apm.requestFlyout.keyMetricsSectionTitle', {
                          defaultMessage: 'Key metrics',
                        })}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <RequestFlyoutRedMetrics
                  latencyAggregationType={latencyAggregationType}
                  setLatencyAggregationType={setLatencyAggregationType}
                />
                <EuiSpacer size="m" />
                <RequestFlyoutLatencyDistribution />

                <EuiSpacer size="m" />

                {/* Breakdown tabs */}
                <EuiTabs size="s">
                  <EuiTab
                    isSelected={activeTab === 'operations'}
                    onClick={() => setActiveTab('operations')}
                    data-test-subj="requestFlyoutTabOperations"
                  >
                    {i18n.translate('xpack.apm.requestFlyout.tabs.operations', {
                      defaultMessage: 'Operations ({target} methods)',
                      values: { target: connection.targetLabel },
                    })}
                  </EuiTab>
                  <EuiTab
                    isSelected={activeTab === 'affectedEndpoints'}
                    onClick={() => setActiveTab('affectedEndpoints')}
                    data-test-subj="requestFlyoutTabAffectedEndpoints"
                  >
                    {i18n.translate('xpack.apm.requestFlyout.tabs.affectedEndpoints', {
                      defaultMessage: '{source} transactions',
                      values: { source: connection.sourceLabel },
                    })}
                  </EuiTab>
                </EuiTabs>
                <EuiSpacer size="s" />

                {activeTab === 'operations' && <RequestFlyoutOperations />}
                {activeTab === 'affectedEndpoints' && <RequestFlyoutAffectedEndpoints />}
              </EuiFlyoutBody>
              <RequestFlyoutFooter />
            </>
          )}
        </ResponsiveFlyout>
      </TimeRangeMetadataContextProvider>
    </RequestFlyoutContextProvider>
  );
}
