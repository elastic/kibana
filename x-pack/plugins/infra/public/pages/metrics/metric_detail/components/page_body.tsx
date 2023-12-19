/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { NodeDetailsMetricData } from '../../../../../common/http_api/node_details_api';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { MetricsTimeInput } from '../hooks/use_metrics_time';
import { Layout } from './layout';

interface Props {
  loading: boolean;
  refetch: () => void;
  type: InventoryItemType;
  metrics: NodeDetailsMetricData[];
  onChangeRangeTime: (time: MetricsTimeInput) => void;
  isLiveStreaming: boolean;
  stopLiveStreaming: () => void;
}

export const PageBody = ({
  loading,
  refetch,
  type,
  metrics,
  onChangeRangeTime,
  isLiveStreaming,
  stopLiveStreaming,
}: Props) => {
  if (loading) {
    return (
      <InfraLoadingPanel
        height="100vh"
        width="auto"
        text={i18n.translate('xpack.infra.metrics.loadingNodeDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  } else if (!loading && metrics && metrics.length === 0) {
    return (
      <NoData
        titleText={i18n.translate('xpack.infra.metrics.emptyViewTitle', {
          defaultMessage: 'There is no data to display.',
        })}
        bodyText={i18n.translate('xpack.infra.metrics.emptyViewDescription', {
          defaultMessage: 'Try adjusting your time or filter.',
        })}
        refetchText={i18n.translate('xpack.infra.metrics.refetchButtonLabel', {
          defaultMessage: 'Check for new data',
        })}
        onRefetch={refetch}
        testString="metricsEmptyViewState"
      />
    );
  }

  return (
    <Layout
      inventoryItemType={type}
      metrics={metrics}
      onChangeRangeTime={onChangeRangeTime}
      isLiveStreaming={isLiveStreaming}
      stopLiveStreaming={stopLiveStreaming}
    />
  );
};
