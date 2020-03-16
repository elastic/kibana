/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { findLayout } from '../../../../common/inventory_models/layouts';
import { InventoryItemType } from '../../../../common/inventory_models/types';

import { MetricsTimeInput } from '../containers/with_metrics_time';
import { InfraLoadingPanel } from '../../../components/loading';
import { NoData } from '../../../components/empty_states';
import { NodeDetailsMetricData } from '../../../../common/http_api/node_details_api';

interface Props {
  loading: boolean;
  refetch: () => void;
  type: InventoryItemType;
  metrics: NodeDetailsMetricData[];
  onChangeRangeTime?: (time: MetricsTimeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
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

  const Layout = findLayout(type);
  return (
    <Layout
      metrics={metrics}
      onChangeRangeTime={onChangeRangeTime}
      isLiveStreaming={isLiveStreaming}
      stopLiveStreaming={stopLiveStreaming}
    />
  );
};
